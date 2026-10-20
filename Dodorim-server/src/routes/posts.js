import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { findOr404, httpError, intId, text } from '../util.js';
import { dir, fileUrl, listFiles, listSlideNos, mediaType, moveInto, readText, removePath, removeWithDb, safeFileParam, SLIDE_TEXT, upload } from '../storage.js';

// 게시글(강의) = posts 테이블 1행 + posts/<ID>/ 폴더. 슬라이드는 posts/<ID>/<번호>/ 폴더
export const postsRouter = Router();

const MAX_SLIDE = 999;
const slideNo = (v) => {
  const n = intId(v, '슬라이드 번호');
  if (n > MAX_SLIDE) throw httpError(400, `슬라이드 번호는 ${MAX_SLIDE} 이하여야 합니다.`);
  return n;
};

const POST_SQL = `
  SELECT p.*, c3.name AS sub_name, c2.name AS mid_name, c1.name AS main_name
  FROM posts p
  JOIN categories c3 ON c3.id = p.category_id
  LEFT JOIN categories c2 ON c2.id = c3.parent_id
  LEFT JOIN categories c1 ON c1.id = c2.parent_id`;

const toPost = async (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  categoryId: row.category_id,
  category: { main: row.main_name, mid: row.mid_name, sub: row.sub_name },
  slideCount: (await listSlideNos(dir('posts', row.id))).length,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function readSlide(postId, no) {
  const d = dir('posts', postId, no);
  const files = await listFiles(d);
  return {
    no,
    text: await readText(path.join(d, SLIDE_TEXT)),
    media: files.map((name) => ({ name, type: mediaType(name), url: fileUrl('posts', postId, no, name) })),
  };
}

// 소단원(depth 3)에만 게시글을 둘 수 있음
async function checkCategory(categoryId) {
  const [c] = await query('SELECT depth FROM categories WHERE id = ?', [categoryId]);
  if (!c) throw httpError(400, '분류를 찾을 수 없습니다.');
  if (c.depth !== 3) throw httpError(400, '게시글은 소단원에만 등록할 수 있습니다.');
}

const getPost = (id) => findOr404(query, 'SELECT * FROM posts WHERE id = ?', id, '게시글');

// 목록: ?categoryId= (하위 분류 포함) &q= (제목 검색)
postsRouter.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.categoryId) {
    where.push(`p.category_id IN (
      WITH RECURSIVE sub AS (SELECT id FROM categories WHERE id = ? UNION ALL SELECT c.id FROM categories c JOIN sub ON c.parent_id = sub.id)
      SELECT id FROM sub)`);
    params.push(intId(req.query.categoryId, 'categoryId'));
  }
  if (req.query.q) {
    where.push('p.title LIKE ?');
    params.push(`%${String(req.query.q).replace(/[\\%_]/g, '\\$&')}%`);
  }
  const rows = await query(`${POST_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.id DESC`, params);
  res.json(await Promise.all(rows.map(toPost)));
});

// 상세: 슬라이드(글 + 사진/영상) 포함
postsRouter.get('/:id', async (req, res) => {
  const id = intId(req.params.id);
  const row = await findOr404(query, `${POST_SQL} WHERE p.id = ?`, id, '게시글');
  const nos = await listSlideNos(dir('posts', id));
  res.json({ ...(await toPost(row)), slides: await Promise.all(nos.map((no) => readSlide(id, no))) });
});

// 등록: multipart (title, categoryId, description). 대표 사진은 쓰지 않음 (사진·영상은 슬라이드에만)
postsRouter.post('/', requireAdmin, upload('image').none(), async (req, res) => {
  const title = text(req.body.title, '제목', { required: true });
  const description = text(req.body.description, '설명', { max: 5000 });
  const categoryId = intId(req.body.categoryId, '분류');
  await checkCategory(categoryId);

  const { insertId } = await query('INSERT INTO posts (title, description, category_id) VALUES (?, ?, ?)', [title, description, categoryId]);
  await fs.mkdir(dir('posts', insertId), { recursive: true });
  const [row] = await query(`${POST_SQL} WHERE p.id = ?`, [insertId]);
  res.status(201).json(await toPost(row));
});

// 수정: 보낸 항목만 변경
postsRouter.put('/:id', requireAdmin, upload('image').none(), async (req, res) => {
  const id = intId(req.params.id);
  const post = await getPost(id);
  const title = req.body.title !== undefined ? text(req.body.title, '제목', { required: true }) : post.title;
  const description = req.body.description !== undefined ? text(req.body.description, '설명', { max: 5000 }) : post.description;
  const categoryId = req.body.categoryId !== undefined ? intId(req.body.categoryId, '분류') : post.category_id;
  if (categoryId !== post.category_id) await checkCategory(categoryId);
  await query('UPDATE posts SET title = ?, description = ?, category_id = ? WHERE id = ?', [title, description, categoryId, id]);
  const [row] = await query(`${POST_SQL} WHERE p.id = ?`, [id]);
  res.json(await toPost(row));
});

/*
 * 같은 강의의 슬라이드 폴더(번호)를 두 요청이 동시에 바꾸면 번호가 꼬이므로 강의별로 한 번에 하나씩 처리.
 * 관리자가 여러 명이어도 서버가 1대(Docker 컨테이너 1개)라는 전제의 메모리 잠금
 */
const postLocks = new Map();
function withPostLock(id, fn) {
  const run = (postLocks.get(id) || Promise.resolve()).then(fn);
  const tail = run.catch(() => {});
  postLocks.set(id, tail);
  tail.then(() => postLocks.get(id) === tail && postLocks.delete(id));
  return run;
}

// 순서 바꾸기 도중 서버가 꺼져 임시 이름(_번호)으로 남은 슬라이드 폴더를 서버 시작 때 맨 뒤 번호로 되살림
export async function recoverSlideFolders() {
  for (const id of await fs.readdir(dir('posts')).catch(() => [])) {
    const d = dir('posts', id);
    const temps = (await fs.readdir(d).catch(() => [])).filter((n) => /^_\d+$/.test(n)).sort((a, b) => a.slice(1) - b.slice(1));
    if (!temps.length) continue;
    let next = Math.max(0, ...(await listSlideNos(d))) + 1;
    for (const t of temps) await fs.rename(path.join(d, t), path.join(d, String(next++)));
    console.warn(`강의 ${id}: 순서 바꾸기 도중 멈춘 슬라이드 ${temps.length}개를 맨 뒤에 다시 붙였습니다. 수정 화면에서 순서를 확인해 주세요.`);
  }
}

postsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  await withPostLock(id, async () => {
    await getPost(id);
    await removeWithDb([dir('posts', id)], () => query('DELETE FROM posts WHERE id = ?', [id]));
  });
  res.status(204).end();
});

// 슬라이드 순서 변경: { order: [3, 1, 2] } 지금 번호들을 새 순서대로 보내면 1, 2, 3...으로 다시 매김 (/:no 보다 먼저 선언)
postsRouter.put('/:id/slides/order', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  const order = Array.isArray(req.body?.order) ? req.body.order.map(slideNo) : [];
  await withPostLock(id, async () => {
    await getPost(id);
    const nos = await listSlideNos(dir('posts', id));
    const sorted = [...order].sort((a, b) => a - b);
    if (order.length !== nos.length || sorted.some((n, i) => n !== nos[i])) throw httpError(400, '다른 관리자가 슬라이드를 바꿨을 수 있습니다. 화면을 새로 고친 뒤 다시 시도해 주세요.');
    // 번호가 겹치지 않게 임시 이름(_번호)으로 옮긴 뒤 새 번호로. 도중에 꺼지면 recoverSlideFolders가 되살림
    for (const n of order) await fs.rename(dir('posts', id, n), dir('posts', id, `_${n}`));
    for (const [i, n] of order.entries()) await fs.rename(dir('posts', id, `_${n}`), dir('posts', id, i + 1));
    await query('UPDATE posts SET updated_at = NOW() WHERE id = ?', [id]);
  });
  res.status(204).end();
});

// 슬라이드 작성/수정: multipart (text, files[]). 폴더가 없으면 새로 만듦. text를 보내면 글 교체, files는 추가
postsRouter.put('/:id/slides/:no', requireAdmin, upload('media').array('files'), async (req, res) => {
  const id = intId(req.params.id);
  const no = slideNo(req.params.no);
  const slideText = req.body.text !== undefined ? text(req.body.text, '슬라이드 글', { max: 20000 }) || '' : undefined;
  await withPostLock(id, async () => {
    await getPost(id);
    const d = dir('posts', id, no);
    await fs.mkdir(d, { recursive: true });
    if (slideText !== undefined) await fs.writeFile(path.join(d, SLIDE_TEXT), slideText, 'utf8');
    for (const file of req.files || []) await moveInto(file, d);
    await query('UPDATE posts SET updated_at = NOW() WHERE id = ?', [id]);
  });
  res.json(await readSlide(id, no));
});

// 슬라이드 삭제 후 뒤 번호를 하나씩 당겨서 1, 2, 3... 순서를 유지
postsRouter.delete('/:id/slides/:no', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  const no = slideNo(req.params.no);
  await withPostLock(id, async () => {
    await getPost(id);
    const nos = await listSlideNos(dir('posts', id));
    if (!nos.includes(no)) throw httpError(404, '슬라이드를 찾을 수 없습니다.');
    await removePath(dir('posts', id, no));
    for (const n of nos.filter((n) => n > no)) await fs.rename(dir('posts', id, n), dir('posts', id, n - 1));
    await query('UPDATE posts SET updated_at = NOW() WHERE id = ?', [id]);
  });
  res.status(204).end();
});

postsRouter.delete('/:id/slides/:no/files/:name', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  const no = slideNo(req.params.no);
  const name = safeFileParam(req.params.name);
  await withPostLock(id, async () => {
    await getPost(id);
    if (!(await listFiles(dir('posts', id, no))).includes(name)) throw httpError(404, '파일을 찾을 수 없습니다.');
    await removePath(dir('posts', id, no, name));
  });
  res.status(204).end();
});
