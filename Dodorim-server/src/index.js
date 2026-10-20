import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { upgradeSchema, waitForDb } from './db.js';
import { adminsRouter, authRouter, checkSecret, ensureAdmin } from './auth.js';
import { ROOT } from './storage.js';
import { postsRouter, recoverSlideFolders } from './routes/posts.js';
import { noticesRouter } from './routes/notices.js';
import { bannersRouter } from './routes/banners.js';
import { categoriesRouter } from './routes/categories.js';
import { suggestionsRouter } from './routes/suggestions.js';
import { cleanTtsCache, speechRouter } from './routes/speech.js';

const PORT = Number(process.env.PORT || 3000);
// React 빌드 결과(dist). Docker 이미지에서는 /app/public, 윈도우 로컬에서는 옆 폴더의 dist
const FRONTEND_DIR = path.resolve(process.env.FRONTEND_DIR || (fs.existsSync('public') ? 'public' : '../Dodorim-react/dist'));

const app = express();
// NAS 앞단에 리버스 프록시(시놀로지 등)를 두면 TRUST_PROXY=1 로 실제 접속 IP를 사용
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable('x-powered-by');

// 보안 헤더 (모든 응답). CSP: 스크립트는 이 서버 것만, 글꼴·아이콘 CSS는 index.html이 쓰는 CDN만 허용,
// 사진·영상·음성은 이 서버와 브라우저 안 미리보기(blob:)만. 다른 사이트가 이 화면을 iframe에 넣지 못하게 함
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});

// API 요청 기록 (docker compose logs -f app 으로 확인): 시각 IP 방법 주소 상태 걸린시간 [관리자]. 본문(비밀번호 등)은 남기지 않음
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl === '/api/health') return; // Docker 상태 확인(30초마다)은 기록하지 않음
    console.log(`${new Date().toISOString()} ${req.ip} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms${req.admin ? ` [${req.admin.username}]` : ''}`);
  });
  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/speech', speechRouter);
app.use('/api', (req, res) => res.status(404).json({ error: '없는 API입니다.' }));

// 업로드 파일 제공. 임시(tmp)·지우는 중(trash)·음성 캐시 폴더는 공개하지 않음
app.use(['/files/tmp', '/files/trash', '/files/tts-cache'], (req, res) => res.status(404).end());
app.use('/files', express.static(ROOT, { dotfiles: 'deny', index: false }));

// 프론트엔드 (HashRouter라 index.html 하나만 있으면 됨).
// 빌드된 assets/ 파일은 이름에 내용 해시가 붙어 바뀌면 이름도 바뀌므로 1년 캐시, 나머지(index.html 등)는 매번 새 버전 확인
const ASSETS = `${path.sep}assets${path.sep}`;
const frontendCache = (res, file) => res.set('Cache-Control', file.includes(ASSETS) ? 'public, max-age=31536000, immutable' : 'no-cache');
if (fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))) app.use(express.static(FRONTEND_DIR, { setHeaders: frontendCache }));
else console.warn(`화면 파일이 없습니다: ${path.join(FRONTEND_DIR, 'index.html')} (Dodorim-react 에서 npm run build 후 서버를 다시 켜세요)`);

// 에러 응답 + 처리되지 못하고 남은 업로드 임시 파일 정리
app.use(async (err, req, res, next) => {
  const leftovers = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
  await Promise.all(leftovers.map((f) => f.path && fsp.rm(f.path, { force: true })));

  let status = err.status || 500;
  let message = err.message;
  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? '파일 용량이 너무 큽니다.' : `업로드 오류: ${err.code}`;
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = '같은 이름이 이미 있습니다.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON 형식이 올바르지 않습니다.';
  } else if (!err.status) {
    // 예상하지 못한 오류만 기록하고 내용은 숨김. 일부러 낸 502/503(음성 안내 미설정·사용량 초과 등)은 메시지 그대로
    console.error(err);
    status = 500;
    message = '서버 오류가 발생했습니다.';
  }
  res.status(status).json({ error: message });
});

// 업로드가 성공하면 tmp의 파일은 옮겨지므로, 여기서는 이전 실행에서 남은 찌꺼기만 비움.
// trash는 삭제하다 멈춘 폴더(storage.js removeWithDb)라 비워도 됨
async function start() {
  checkSecret();
  for (const d of ['tmp', 'trash']) await fsp.rm(path.join(ROOT, d), { recursive: true, force: true });
  for (const d of ['tmp', 'trash', 'posts', 'notices', 'banners', 'categories']) await fsp.mkdir(path.join(ROOT, d), { recursive: true });
  await recoverSlideFolders();
  await waitForDb();
  await upgradeSchema();
  await ensureAdmin();
  cleanTtsCache().catch((e) => console.error('음성 캐시 정리 실패:', e.message));
  app.listen(PORT, () => console.log(`두드림 서버 실행 중: http://localhost:${PORT} (저장소: ${ROOT})`));
}

start().catch((e) => {
  console.error('서버 시작 실패:', e.message);
  if (e.code === 'EACCES') console.error(`저장소 폴더에 쓰기 권한이 없습니다. NAS에서 실행: sudo chown -R 1000:1000 data/storage`);
  process.exit(1);
});
