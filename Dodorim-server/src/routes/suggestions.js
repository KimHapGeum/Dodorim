import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { findOr404, httpError, intId, rateLimit, text } from '../util.js';

export const suggestionsRouter = Router();

const toSuggestion = (row) => ({ id: row.id, title: row.title, content: row.content, status: row.status, date: row.created_at });

// 건의 도배 방지: 같은 IP(같은 기기·같은 공유기)에서는 이 간격마다 한 번만 보낼 수 있음
const SUGGESTION_INTERVAL_MS = 60_000;

// 누구나 작성 가능 (교육 화면의 건의하기 팝업). 이름은 받지 않고 내용만. 제목은 본문 앞 24자
suggestionsRouter.post('/', rateLimit(1, SUGGESTION_INTERVAL_MS, '건의는 1분에 한 번만 보낼 수 있습니다.'), async (req, res) => {
  const content = text(req.body?.content, '건의 내용', { max: 500, required: true });
  const title = content.length > 24 ? `${content.slice(0, 24)}…` : content;
  const { insertId } = await query('INSERT INTO suggestions (title, content) VALUES (?, ?)', [title, content]);
  res.status(201).json({ id: insertId });
});

// 관리자 목록: ?status=pending|done &sort=latest|oldest
suggestionsRouter.get('/', requireAdmin, async (req, res) => {
  const { status, sort } = req.query;
  if (status && !['pending', 'done'].includes(status)) throw httpError(400, 'status 값이 올바르지 않습니다.');
  const rows = await query(
    `SELECT * FROM suggestions ${status ? 'WHERE status = ?' : ''} ORDER BY created_at ${sort === 'oldest' ? 'ASC' : 'DESC'}, id`,
    status ? [status] : [],
  );
  const [{ total, pending }] = await query("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'pending'), 0) AS pending FROM suggestions");
  res.json({ total: Number(total), pending: Number(pending), items: rows.map(toSuggestion) });
});

suggestionsRouter.patch('/:id', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  const status = req.body?.status;
  if (!['pending', 'done'].includes(status)) throw httpError(400, 'status는 pending 또는 done 이어야 합니다.');
  await findOr404(query, 'SELECT id FROM suggestions WHERE id = ?', id, '건의사항');
  await query('UPDATE suggestions SET status = ? WHERE id = ?', [status, id]);
  res.json(toSuggestion(await findOr404(query, 'SELECT * FROM suggestions WHERE id = ?', id, '건의사항')));
});

suggestionsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = intId(req.params.id);
  await findOr404(query, 'SELECT id FROM suggestions WHERE id = ?', id, '건의사항');
  await query('DELETE FROM suggestions WHERE id = ?', [id]);
  res.status(204).end();
});
