import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { dateValue, findOr404, httpError, intId, text } from '../util.js';
import { dir, fileUrl, listFiles, moveInto, NOTICE_TEXT, readText, removePath, removeWithDb, safeFileParam, upload } from '../storage.js';

// 공지 = notices 테이블 1행 + notices/<ID>/ 폴더 (content.txt 본문 + 첨부파일). 게시글 폴더와 별도로 관리
export const noticesRouter = Router();

const toNotice = async (row) => {
  const d = dir('notices', row.id);
  return {
    id: row.id,
    title: row.title,
    date: row.notice_date,
    content: await readText(path.join(d, NOTICE_TEXT)),
    attachments: (await listFiles(d)).map((name) => ({ name, url: fileUrl('notices', row.id, name) })),
    updatedAt: row.updated_at,
  };
};

const getNotice = (id) => findOr404(query, 'SELECT * FROM notices WHERE id = ?', id, '공지사항');
const writeContent = async (id, content) => {
  await fs.mkdir(dir('notices', id), { recursive: true });
  await fs.writeFile(path.join(dir('notices', id), NOTICE_TEXT), content, 'utf8');
};

// 최신 날짜순
noticesRouter.get('/', async (req, res) => {
  const rows = await query('SELECT * FROM notices ORDER BY notice_date DESC, id DESC');
  res.json(await Promise.all(rows.map(toNotice)));
});

noticesRouter.get('/:id', async (req, res) => res.json(await toNotice(await getNotice(intId(req.params.id)))));

// 등록: multipart (title, date, content, files[])
noticesRouter.post('/', requireAdmin, upload('attachment').array('files'), async (req, res) => {
  const title = text(req.body.title, '제목', { required: true });
  const date = dateValue(req.body.date);
  const content = text(req.body.content, '내용', { max: 20000, required: true });

  const { insertId } = await query('INSERT INTO notices (title, notice_date) VALUES (?, ?)', [title, date]);
  await writeContent(insertId, content);
  for (const file of req.files || []) await moveInto(file, dir('notices', insertId));
  res.status(201).json(await toNotice(await getNotice(insertId)));
});

// 수정: 보낸 항목만 변경, files는 첨부 추가
noticesRouter.put('/:id', requireAdmin, upload('attachment').array('files'), async (req, res) => {
  const id = intId(req.params.id);
  const notice = await getNotice(id);
  const title = req.body.title !== undefined ? text(req.body.title, '제목', { required: true }) : notice.title;
  const date = req.body.date !== undefined ? dateValue(req.body.date) : notice.notice_date;
  if (req.body.content !== undefined) await writeContent(id, text(req.body.content, '내용', { max: 20000, required: true }));
  for (const file of req.files || []) await moveInto(file, dir('notices', id));
  await query('UPDATE notices SET title = ?, notice_date = ?, updated_at = NOW() WHERE id = ?', [title, date, id]);
  res.json(await toNotice(await getNotice(id)));
});

noticesRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  await getNotice(id);
  await removeWithDb([dir('notices', id)], () => query('DELETE FROM notices WHERE id = ?', [id]));
  res.status(204).end();
});

noticesRouter.delete('/:id/files/:name', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  const name = safeFileParam(req.params.name);
  await getNotice(id);
  if (!(await listFiles(dir('notices', id))).includes(name)) throw httpError(404, '파일을 찾을 수 없습니다.');
  await removePath(dir('notices', id, name));
  res.status(204).end();
});
