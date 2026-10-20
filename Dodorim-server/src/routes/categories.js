import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAdmin } from '../auth.js';
import { findOr404, httpError, intId, text } from '../util.js';
import { dir, fileUrl, moveInto, removePath, removeWithDb, upload } from '../storage.js';

// 대단원(1) > 중단원(2) > 소단원(3). 아이콘은 categories/<ID>/ 폴더
export const categoriesRouter = Router();

const toCategory = (row) => ({
  id: row.id,
  parentId: row.parent_id,
  depth: row.depth,
  name: row.name,
  description: row.description,
  iconUrl: row.icon_file ? fileUrl('categories', row.id, row.icon_file) : null,
  sortOrder: row.sort_order,
});

// 단원 선택 화면 카드의 설명 칸은 2줄(22px 글자). 모든 화면에서 2줄에 34자 이상 들어가는 것을 확인했고, 글꼴 차이를 감안해 30자로 제한
// (Dodorim-react: styles/select_grid.css, pages/Addition.jsx 의 UNIT_DESC_MAX 와 같은 값)
const UNIT_DESC_MAX = 30;
function unitDescription(value) {
  const d = text(value, '설명', { max: UNIT_DESC_MAX });
  if (d && d.split('\n').length > 2) throw httpError(400, '설명은 2줄까지 입력할 수 있습니다.');
  return d;
}

const getCategory = (id) => findOr404(query, 'SELECT * FROM categories WHERE id = ?', id, '분류');

// 같은 상위 단원 안에 같은 이름 금지. DB의 UNIQUE(parent_id, name)는 parent_id가 NULL(대단원)이면 중복을 막지 못하므로 직접 확인
// (화면이 단원 이름으로 전용 화면을 찾기 때문에 같은 이름의 대단원이 있으면 엉뚱한 단원이 열림)
async function checkDuplicateName(parentId, name, exceptId = 0) {
  const [dup] = await query('SELECT id FROM categories WHERE parent_id <=> ? AND name = ? AND id <> ?', [parentId, name, exceptId]);
  if (dup) throw httpError(409, `같은 위치에 "${name}" 단원이 이미 있습니다.`);
}

// 트리 형태: [{ ...대단원, children: [{ ...중단원, children: [소단원] }] }]
categoriesRouter.get('/', async (req, res) => {
  const rows = (await query('SELECT * FROM categories ORDER BY depth, sort_order, id')).map((r) => ({ ...toCategory(r), children: [] }));
  const byId = new Map(rows.map((c) => [c.id, c]));
  const roots = [];
  for (const c of rows) (c.parentId ? byId.get(c.parentId)?.children : roots)?.push(c);
  res.json(roots);
});

// 등록: multipart (parentId 없으면 대단원, name, description, sortOrder, icon)
categoriesRouter.post('/', requireAdmin, upload('image').single('icon'), async (req, res) => {
  const name = text(req.body.name, '이름', { max: 100, required: true });
  const description = unitDescription(req.body.description);
  const parentId = req.body.parentId ? intId(req.body.parentId, '상위 분류') : null;
  const depth = parentId ? (await getCategory(parentId)).depth + 1 : 1;
  if (depth > 3) throw httpError(400, '소단원 아래에는 분류를 만들 수 없습니다.');
  await checkDuplicateName(parentId, name);
  // 순서를 안 보내면 같은 상위 분류의 맨 뒤에 추가
  const [{ last }] = await query('SELECT COALESCE(MAX(sort_order), 0) AS last FROM categories WHERE parent_id <=> ?', [parentId]);
  const sortOrder = req.body.sortOrder !== undefined && Number.isInteger(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : last + 1;

  const { insertId } = await query(
    'INSERT INTO categories (parent_id, depth, name, description, sort_order) VALUES (?, ?, ?, ?, ?)',
    [parentId, depth, name, description, sortOrder],
  );
  if (req.file) await query('UPDATE categories SET icon_file = ? WHERE id = ?', [await moveInto(req.file, dir('categories', insertId)), insertId]);
  res.status(201).json(toCategory(await getCategory(insertId)));
});

// 순서 변경: { ids: [3, 1, 2] } 같은 상위 단원 안의 단원들을 배열 순서대로 (/:id 보다 먼저 선언)
categoriesRouter.put('/order', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => intId(v)) : [];
  if (!ids.length) throw httpError(400, 'ids 배열이 필요합니다.');
  const rows = await query('SELECT parent_id FROM categories WHERE id IN (?)', [ids]);
  if (rows.length !== ids.length || new Set(rows.map((r) => r.parent_id)).size !== 1) throw httpError(400, '같은 상위 단원 안의 단원만 순서를 바꿀 수 있습니다.');
  await transaction(async (conn) => {
    for (const [i, id] of ids.entries()) await conn.query('UPDATE categories SET sort_order = ? WHERE id = ?', [i + 1, id]);
  });
  res.status(204).end();
});

// 수정: 보낸 항목만 변경. parentId를 보내면 같은 단계의 다른 상위 단원으로 옮김 (중단원 → 다른 대단원, 소단원 → 다른 중단원)
categoriesRouter.put('/:id', requireAdmin, upload('image').single('icon'), async (req, res) => {
  const id = intId(req.params.id);
  const c = await getCategory(id);
  const name = req.body.name !== undefined ? text(req.body.name, '이름', { max: 100, required: true }) : c.name;
  const description = req.body.description !== undefined ? unitDescription(req.body.description) : c.description;
  let parentId = c.parent_id;
  let sortOrder = c.sort_order;
  if (req.body.parentId !== undefined && Number(req.body.parentId) !== c.parent_id) {
    if (c.depth === 1) throw httpError(400, '대단원은 다른 단원 아래로 옮길 수 없습니다.');
    parentId = intId(req.body.parentId, '상위 분류');
    if ((await getCategory(parentId)).depth !== c.depth - 1) throw httpError(400, '같은 단계의 상위 단원으로만 옮길 수 있습니다.');
    // 옮긴 곳의 맨 뒤에 붙임
    sortOrder = (await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS last FROM categories WHERE parent_id = ?', [parentId]))[0].last;
  }
  if (req.body.sortOrder !== undefined && Number.isInteger(Number(req.body.sortOrder))) sortOrder = Number(req.body.sortOrder);
  if (name !== c.name || parentId !== c.parent_id) await checkDuplicateName(parentId, name, id);
  let icon = c.icon_file;
  if (req.file) {
    icon = await moveInto(req.file, dir('categories', id));
    if (c.icon_file && c.icon_file !== icon) await removePath(dir('categories', id, c.icon_file));
  }
  await query('UPDATE categories SET parent_id = ?, name = ?, description = ?, sort_order = ?, icon_file = ? WHERE id = ?', [parentId, name, description, sortOrder, icon, id]);
  res.json(toCategory(await getCategory(id)));
});

// 하위 분류까지 함께 삭제. 게시글이 남아 있으면 DB가 거부(409)
categoriesRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  await getCategory(id);
  const subtree = await query(
    'WITH RECURSIVE sub AS (SELECT id FROM categories WHERE id = ? UNION ALL SELECT c.id FROM categories c JOIN sub ON c.parent_id = sub.id) SELECT id FROM sub',
    [id],
  );
  await removeWithDb(subtree.map(({ id: cid }) => dir('categories', cid)), async () => {
    try {
      await query('DELETE FROM categories WHERE id = ?', [id]);
    } catch (e) {
      if (e.code === 'ER_ROW_IS_REFERENCED_2') throw httpError(409, '이 분류(또는 하위 분류)에 게시글이 있어 삭제할 수 없습니다. 게시글을 먼저 삭제하거나 옮겨 주세요.');
      throw e;
    }
  });
  res.status(204).end();
});
