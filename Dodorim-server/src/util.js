// 요청 값 검증 도우미. 실패하면 상태 코드가 붙은 에러를 던지고 index.js의 에러 핸들러가 응답합니다.

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function intId(value, name = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw httpError(400, `${name} 값이 올바르지 않습니다.`);
  return n;
}

// 문자열 필드: 줄바꿈 통일(multipart 폼은 \r\n으로 보냄), 앞뒤 공백 제거, 필수 여부와 최대 길이 검사. 비어 있으면 null
export function text(value, name, { max = 200, required = false } = {}) {
  const s = typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
  if (required && !s) throw httpError(400, `${name}을(를) 입력해 주세요.`);
  if (s.length > max) throw httpError(400, `${name}은(는) ${max}자 이하로 입력해 주세요.`);
  return s || null;
}

// "2026.09.22" 또는 "2026-09-22" -> "2026-09-22"
export function dateValue(value, name = '날짜') {
  const s = String(value || '').trim().replace(/\./g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw httpError(400, `${name} 형식이 올바르지 않습니다. (예: 2026-09-22)`);
  return s;
}

export function colorValue(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw httpError(400, '색상은 #RRGGBB 형식이어야 합니다.');
  return value;
}

export async function findOr404(query, sql, id, what) {
  const [row] = await query(sql, [id]);
  if (!row) throw httpError(404, `${what}을(를) 찾을 수 없습니다.`);
  return row;
}

// 간단한 IP별 요청 제한 (유료 음성 API·공개 작성 API 남용 방지). 서버 1대 기준 메모리 저장
// windowMs 동안 max번까지 허용. 넘으면 남은 시간(초)을 알려 줌
export function rateLimit(max, windowMs, message = '요청이 너무 많습니다.') {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const rec = hits.get(req.ip);
    if (!rec || now - rec.start > windowMs) hits.set(req.ip, { start: now, count: 1 });
    else if (++rec.count > max) {
      const wait = Math.ceil((rec.start + windowMs - now) / 1000);
      res.set('Retry-After', String(wait));
      throw httpError(429, `${message} ${wait}초 후에 다시 시도해 주세요.`);
    }
    if (hits.size > 10000) hits.clear(); // 메모리 무한 증가 방지
    next();
  };
}
