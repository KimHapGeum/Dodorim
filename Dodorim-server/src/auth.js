import crypto from 'node:crypto';
import { Router } from 'express';
import { query } from './db.js';
import { findOr404, httpError, intId, text } from './util.js';

const SECRET = process.env.TOKEN_SECRET || '';
const TOKEN_HOURS = Number(process.env.TOKEN_HOURS || 12);

export function checkSecret() {
  if (SECRET.length < 32) throw new Error('TOKEN_SECRET 환경변수를 32자 이상으로 설정해 주세요.');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const hash = Buffer.from(hashHex, 'hex');
  return crypto.timingSafeEqual(hash, crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), hash.length));
}

const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

// 토큰 = { id, v(token_version) } 서명. 비밀번호를 바꾸거나 계정을 지우면 v가 안 맞아 예전 토큰은 바로 무효
export function signToken(admin) {
  const body = Buffer.from(JSON.stringify({ id: admin.id, v: admin.token_version, exp: Date.now() + TOKEN_HOURS * 3600_000 })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  return payload.exp > Date.now() ? payload : null;
}

// 관리자 전용 API 보호: Authorization: Bearer <token>. 요청마다 DB에서 계정이 남아 있고 토큰 버전이 맞는지 확인
export async function requireAdmin(req, res, next) {
  const payload = verifyToken((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const [admin] = payload ? await query('SELECT id, username, is_master, token_version FROM admins WHERE id = ?', [payload.id]) : [];
  if (!admin || admin.token_version !== payload.v) throw httpError(401, '관리자 로그인이 필요합니다.');
  req.admin = { id: admin.id, username: admin.username, master: Boolean(admin.is_master) };
  next();
}

// 마스터 계정만 (하위 관리자 계정 관리)
export function requireMaster(req, res, next) {
  if (!req.admin?.master) throw httpError(403, '마스터 계정만 할 수 있습니다.');
  next();
}

// 아이디: 공백 없이 3~50자. 비밀번호: 8자 이상
const usernameValue = (v) => {
  const s = text(v, '아이디', { max: 50, required: true });
  if (!/^\S{3,50}$/.test(s)) throw httpError(400, '아이디는 공백 없이 3자 이상으로 입력해 주세요.');
  return s;
};
const passwordValue = (v, name = '비밀번호') => {
  const s = typeof v === 'string' ? v : '';
  if (s.length < 8 || s.length > 200) throw httpError(400, `${name}는 8자 이상으로 입력해 주세요.`);
  return s;
};

// 서버 시작 시: 마스터가 없으면 가장 먼저 만든 계정을 마스터로 (열은 db.js upgradeSchema에서 추가).
// 관리자 계정이 하나도 없으면 .env의 ADMIN_USERNAME / ADMIN_PASSWORD로 첫 계정(마스터) 생성
export async function ensureAdmin() {
  const [{ n, masters }] = await query('SELECT COUNT(*) AS n, COALESCE(SUM(is_master), 0) AS masters FROM admins');
  if (n > 0) {
    if (Number(masters) === 0) await query('UPDATE admins SET is_master = 1 ORDER BY id LIMIT 1');
    return;
  }
  const { ADMIN_USERNAME: username, ADMIN_PASSWORD: password } = process.env;
  if (!username || !password || password.length < 8) {
    console.warn('관리자 계정이 없습니다. ADMIN_USERNAME, ADMIN_PASSWORD(8자 이상)를 설정하고 다시 시작하세요.');
    return;
  }
  await query('INSERT INTO admins (username, password_hash, is_master) VALUES (?, ?, 1)', [username, hashPassword(password)]);
  console.log(`첫 관리자(마스터) 계정을 만들었습니다: ${username}`);
}

// 로그인 무차별 대입 방지: IP당 15분에 10회 실패 시 잠시 차단
const failures = new Map();
const LIMIT = 10;
const WINDOW = 15 * 60_000;

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const now = Date.now();
  const rec = failures.get(req.ip);
  if (rec && now - rec.first < WINDOW && rec.count >= LIMIT) throw httpError(429, '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');

  const username = text(req.body?.username, '아이디', { max: 50, required: true });
  const password = String(req.body?.password || '');
  const [admin] = await query('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    failures.set(req.ip, rec && now - rec.first < WINDOW ? { ...rec, count: rec.count + 1 } : { first: now, count: 1 });
    // 메모리 무한 증가 방지: 15분 지난 기록만 지움 (전부 지우면 많은 IP로 시도해 차단을 풀 수 있음)
    if (failures.size > 10000) for (const [ip, r] of failures) if (now - r.first >= WINDOW) failures.delete(ip);
    throw httpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  failures.delete(req.ip);
  res.json({ token: signToken(admin), expiresInHours: TOKEN_HOURS });
});

authRouter.get('/me', requireAdmin, (req, res) => res.json(req.admin));

// 내 비밀번호 변경: { currentPassword, newPassword }. 다른 기기의 로그인은 끊기고, 이 기기는 새 토큰으로 계속 사용
authRouter.put('/password', requireAdmin, async (req, res) => {
  const newPassword = passwordValue(req.body?.newPassword, '새 비밀번호');
  const [admin] = await query('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
  if (!verifyPassword(String(req.body?.currentPassword || ''), admin.password_hash)) throw httpError(400, '현재 비밀번호가 올바르지 않습니다.');
  await query('UPDATE admins SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [hashPassword(newPassword), admin.id]);
  const [updated] = await query('SELECT * FROM admins WHERE id = ?', [admin.id]);
  res.json({ token: signToken(updated), expiresInHours: TOKEN_HOURS });
});

// ── 하위 관리자 계정 관리 (마스터만). 마스터 계정 자체는 여기서 바꾸거나 지울 수 없음 ──
export const adminsRouter = Router();
adminsRouter.use(requireAdmin, requireMaster);

const toAdmin = (row) => ({ id: row.id, username: row.username, master: Boolean(row.is_master), createdAt: row.created_at });
const getSubAdmin = async (id) => {
  const row = await findOr404(query, 'SELECT * FROM admins WHERE id = ?', id, '관리자 계정');
  if (row.is_master) throw httpError(400, '마스터 계정은 여기서 바꾸거나 삭제할 수 없습니다.');
  return row;
};
const duplicateName = (e) => (e.code === 'ER_DUP_ENTRY' ? httpError(409, '이미 있는 아이디입니다.') : e);

adminsRouter.get('/', async (req, res) => {
  res.json((await query('SELECT * FROM admins ORDER BY is_master DESC, id')).map(toAdmin));
});

// 등록: { username, password }
adminsRouter.post('/', async (req, res) => {
  const username = usernameValue(req.body?.username);
  const password = passwordValue(req.body?.password);
  const { insertId } = await query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hashPassword(password)]).catch((e) => { throw duplicateName(e); });
  res.status(201).json(toAdmin((await query('SELECT * FROM admins WHERE id = ?', [insertId]))[0]));
});

// 수정: { username?, password? } 보낸 것만. 비밀번호를 바꾸면 그 계정의 로그인이 끊김
adminsRouter.put('/:id', async (req, res) => {
  const row = await getSubAdmin(intId(req.params.id));
  const username = req.body?.username !== undefined ? usernameValue(req.body.username) : row.username;
  const password = req.body?.password ? passwordValue(req.body.password) : null;
  await query(
    `UPDATE admins SET username = ?${password ? ', password_hash = ?, token_version = token_version + 1' : ''} WHERE id = ?`,
    password ? [username, hashPassword(password), row.id] : [username, row.id],
  ).catch((e) => { throw duplicateName(e); });
  res.json(toAdmin((await query('SELECT * FROM admins WHERE id = ?', [row.id]))[0]));
});

adminsRouter.delete('/:id', async (req, res) => {
  const row = await getSubAdmin(intId(req.params.id));
  await query('DELETE FROM admins WHERE id = ?', [row.id]);
  res.status(204).end();
});
