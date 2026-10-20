import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAdmin } from '../auth.js';
import { colorValue, findOr404, httpError, intId, text } from '../util.js';
import { dir, fileUrl, moveInto, removePath, removeWithDb, upload } from '../storage.js';

// 메인 화면 슬라이더 배너. 이미지는 banners/<ID>/ 폴더, 노출 순서는 sort_order
export const bannersRouter = Router();

const toBanner = (row) => ({
  id: row.id,
  title: row.title,
  desc: row.description,
  img: fileUrl('banners', row.id, row.image_file),
  imgName: row.image_file,
  color: row.color,
  subColor: row.sub_color,
  sortOrder: row.sort_order,
});

const getBanner = (id) => findOr404(query, 'SELECT * FROM banners WHERE id = ?', id, '배너');

bannersRouter.get('/', async (req, res) => {
  res.json((await query('SELECT * FROM banners ORDER BY sort_order, id')).map(toBanner));
});

// 등록: multipart (title, desc, color, subColor, image) — 맨 뒤 순서로 추가
bannersRouter.post('/', requireAdmin, upload('image').single('image'), async (req, res) => {
  const title = text(req.body.title, '제목', { required: true });
  const desc = text(req.body.desc, '설명', { max: 1000, required: true });
  const color = colorValue(req.body.color, '#0056b3');
  const subColor = colorValue(req.body.subColor, '#a5c0e4');
  if (!req.file) throw httpError(400, '배너 이미지 파일을 선택해 주세요.');

  const [{ next }] = await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM banners');
  const { insertId } = await query(
    'INSERT INTO banners (title, description, image_file, color, sub_color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [title, desc, '', color, subColor, next],
  );
  const image = await moveInto(req.file, dir('banners', insertId));
  await query('UPDATE banners SET image_file = ? WHERE id = ?', [image, insertId]);
  res.status(201).json(toBanner(await getBanner(insertId)));
});

// 순서 변경: { ids: [3, 1, 2] } 배열 순서대로 sort_order 재지정 (/:id 보다 먼저 선언)
bannersRouter.put('/order', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => intId(v)) : null;
  if (!ids?.length) throw httpError(400, 'ids 배열이 필요합니다.');
  await transaction(async (conn) => {
    for (const [i, id] of ids.entries()) await conn.query('UPDATE banners SET sort_order = ? WHERE id = ?', [i + 1, id]);
  });
  res.json((await query('SELECT * FROM banners ORDER BY sort_order, id')).map(toBanner));
});

// 수정: 보낸 항목만 변경, image를 보내면 교체
bannersRouter.put('/:id', requireAdmin, upload('image').single('image'), async (req, res) => {
  const id = intId(req.params.id);
  const b = await getBanner(id);
  const title = req.body.title !== undefined ? text(req.body.title, '제목', { required: true }) : b.title;
  const desc = req.body.desc !== undefined ? text(req.body.desc, '설명', { max: 1000, required: true }) : b.description;
  const color = colorValue(req.body.color, b.color);
  const subColor = colorValue(req.body.subColor, b.sub_color);
  let image = b.image_file;
  if (req.file) {
    image = await moveInto(req.file, dir('banners', id));
    if (b.image_file && b.image_file !== image) await removePath(dir('banners', id, b.image_file));
  }
  await query('UPDATE banners SET title = ?, description = ?, color = ?, sub_color = ?, image_file = ? WHERE id = ?', [title, desc, color, subColor, image, id]);
  res.json(toBanner(await getBanner(id)));
});

bannersRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  await getBanner(id);
  await removeWithDb([dir('banners', id)], () => query('DELETE FROM banners WHERE id = ?', [id]));
  res.status(204).end();
});
