// API 통합 테스트: 서버(npm run dev)와 DB를 띄운 뒤 `npm test`
// 주의: 테스트용 게시글/공지/배너/건의를 만들고 지웁니다. 운영 DB에서는 실행하지 마세요.
// 건의는 같은 IP에서 1분에 1번만 보낼 수 있으므로, 테스트를 다시 돌리거나 화면 테스트(test:smoke)를 이어서 돌릴 때는 1분 기다리세요.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
let token;

async function api(method, path, body, auth = true) {
  const headers = auth && token ? { Authorization: `Bearer ${token}` } : {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { method, headers, body: body instanceof FormData ? body : body && JSON.stringify(body) });
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  return { status: r.status, data };
}

const form = (fields, files = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  for (const [k, list] of Object.entries(files)) for (const [name, content, type] of list) f.append(k, new Blob([content], { type }), name);
  return f;
};

test('로그인과 권한', async () => {
  assert.equal((await api('POST', '/api/notices', form({ title: 'x' }), false)).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { username: process.env.ADMIN_USERNAME, password: 'wrong-password' })).status, 401);
  const r = await api('POST', '/api/auth/login', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  assert.equal(r.status, 200);
  token = r.data.token;
  assert.equal((await api('GET', '/api/auth/me')).data.username, process.env.ADMIN_USERNAME);
});

test('관리자 계정: 마스터만 하위 관리자 관리, 비밀번호 변경·삭제 시 예전 로그인 끊김', async () => {
  assert.equal((await api('GET', '/api/auth/me')).data.master, true, '.env의 첫 계정은 마스터');
  const username = `sub${Date.now()}`;
  const created = await api('POST', '/api/admins', { username, password: 'sub-pass-1' });
  assert.equal(created.status, 201);
  assert.equal((await api('POST', '/api/admins', { username, password: 'sub-pass-1' })).status, 409);
  assert.equal((await api('POST', '/api/admins', { username: 'a b', password: 'sub-pass-1' })).status, 400);
  const login = async (pw) => (await api('POST', '/api/auth/login', { username, password: pw }, false)).data?.token;
  const as = async (t, method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${t}`, ...(body && { 'Content-Type': 'application/json' }) }, body: body && JSON.stringify(body) });
    return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
  };
  const sub = await login('sub-pass-1');
  assert.equal((await as(sub, 'GET', '/api/auth/me')).data.master, false);
  assert.equal((await as(sub, 'GET', '/api/admins')).status, 403, '하위 관리자는 계정 관리 불가');
  // 마스터 계정은 /api/admins 로 바꾸거나 지울 수 없음
  const masterId = (await api('GET', '/api/auth/me')).data.id;
  assert.equal((await api('DELETE', `/api/admins/${masterId}`)).status, 400);
  // 내 비밀번호 변경 → 새 토큰, 예전 토큰 무효
  assert.equal((await as(sub, 'PUT', '/api/auth/password', { currentPassword: 'wrong', newPassword: 'sub-pass-2' })).status, 400);
  const changed = await as(sub, 'PUT', '/api/auth/password', { currentPassword: 'sub-pass-1', newPassword: 'sub-pass-2' });
  assert.equal(changed.status, 200);
  assert.equal((await as(sub, 'GET', '/api/auth/me')).status, 401);
  assert.equal((await as(changed.data.token, 'GET', '/api/auth/me')).status, 200);
  // 마스터가 비밀번호를 재설정 → 하위 관리자 로그인 끊김
  assert.equal((await api('PUT', `/api/admins/${created.data.id}`, { password: 'reset-pass-1' })).status, 200);
  assert.equal((await as(changed.data.token, 'GET', '/api/auth/me')).status, 401);
  const reset = await login('reset-pass-1');
  // 삭제 → 바로 끊김
  assert.equal((await api('DELETE', `/api/admins/${created.data.id}`)).status, 204);
  assert.equal((await as(reset, 'GET', '/api/auth/me')).status, 401);
});

test('같은 위치에 같은 이름의 단원 금지 (대단원 포함)', async () => {
  const name = `중복${Date.now()}`;
  const a = await api('POST', '/api/categories', form({ name }));
  assert.equal(a.status, 201);
  assert.equal((await api('POST', '/api/categories', form({ name }))).status, 409, '대단원 이름 중복');
  const b = await api('POST', '/api/categories', form({ name: `${name}B` }));
  assert.equal((await api('PUT', `/api/categories/${b.data.id}`, form({ name }))).status, 409, '이름을 바꿔서 중복');
  assert.equal((await api('PUT', `/api/categories/${a.data.id}`, form({ name, description: '설명만 바꿈' }))).status, 200, '자기 이름은 그대로 두고 수정 가능');
  for (const c of [a, b]) await api('DELETE', `/api/categories/${c.data.id}`);
});

test('이미지 업로드는 20MB까지', async () => {
  const r = await api('POST', '/api/banners', form({ title: 't', desc: 'd' }, { image: [['big.png', Buffer.alloc(21 * 1024 * 1024), 'image/png']] }));
  assert.equal(r.status, 400);
  assert.match(r.data.error, /최대 20MB/);
});

test('분류 트리', async () => {
  const { data } = await api('GET', '/api/categories');
  const kiosk = data.find((c) => c.name === '키오스크');
  assert.equal(kiosk.children.find((c) => c.name === '병원').children[0].name, '동네병원');
});

test('단원 설명은 30자·2줄까지 (선택 화면 카드 설명 칸)', async () => {
  const name = `설명제한${Date.now()}`;
  assert.equal((await api('POST', '/api/categories', form({ name, description: '가'.repeat(31) }))).status, 400);
  assert.equal((await api('POST', '/api/categories', form({ name, description: '한 줄\n두 줄\n세 줄' }))).status, 400);
  const ok = await api('POST', '/api/categories', form({ name, description: `${'가'.repeat(15)}\n${'나'.repeat(14)}` }));
  assert.equal(ok.status, 201);
  assert.equal((await api('PUT', `/api/categories/${ok.data.id}`, form({ description: '다'.repeat(31) }))).status, 400);
  assert.equal((await api('DELETE', `/api/categories/${ok.data.id}`)).status, 204);
});

test('단원 순서 바꾸기와 다른 상위 단원으로 옮기기', async () => {
  const cats = (await api('GET', '/api/categories')).data;
  const kiosk = cats.find((c) => c.name === '키오스크');
  const device = cats.find((c) => c.name === '전자기기');
  const a = (await api('POST', '/api/categories', form({ parentId: kiosk.id, name: `순서A${Date.now()}` }))).data;
  const b = (await api('POST', '/api/categories', form({ parentId: kiosk.id, name: `순서B${Date.now()}` }))).data;
  const ids = [...kiosk.children.map((c) => c.id), b.id, a.id];
  assert.equal((await api('PUT', '/api/categories/order', { ids })).status, 204);
  assert.deepEqual((await api('GET', '/api/categories')).data.find((c) => c.id === kiosk.id).children.map((c) => c.id), ids);
  // 상위 단원이 다른 단원이 섞이면 거부
  assert.equal((await api('PUT', '/api/categories/order', { ids: [a.id, device.id] })).status, 400);
  // 중단원은 다른 대단원 아래로만 (중단원 아래·대단원 자체 이동은 거부)
  assert.equal((await api('PUT', `/api/categories/${a.id}`, form({ parentId: kiosk.children[0].id }))).status, 400);
  assert.equal((await api('PUT', `/api/categories/${kiosk.id}`, form({ parentId: device.id }))).status, 400);
  const moved = await api('PUT', `/api/categories/${a.id}`, form({ parentId: device.id }));
  assert.equal(moved.status, 200);
  assert.equal(moved.data.parentId, device.id);
  assert.equal(moved.data.sortOrder, device.children.length + 1, '옮긴 곳의 맨 뒤');
  for (const c of [a, b]) assert.equal((await api('DELETE', `/api/categories/${c.id}`)).status, 204);
});

test('게시글 폴더와 슬라이드 폴더', async () => {
  const cats = (await api('GET', '/api/categories')).data;
  const hospital = cats.find((c) => c.name === '키오스크').children.find((c) => c.name === '병원');
  const sub = hospital.children.find((c) => c.name === '동네병원');
  assert.equal((await api('POST', '/api/posts', form({ title: '중분류에 등록', categoryId: hospital.id }))).status, 400);

  // 대표 사진은 받지 않음 (사진·영상은 슬라이드에만)
  assert.equal((await api('POST', '/api/posts', form({ title: '표지', categoryId: sub.id }, { cover: [['표지.png', 'png', 'image/png']] }))).status, 400);
  const created = await api('POST', '/api/posts', form({ title: '접수 연습', categoryId: sub.id, description: '설명' }));
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(created.data.description, '설명');

  for (const no of [1, 2, 3]) {
    const s = await api('PUT', `/api/posts/${id}/slides/${no}`, form({ text: `${no}번 슬라이드 글` }, { files: [[`사진${no}.jpg`, 'jpg', 'image/jpeg'], ['영상.mp4', 'mp4', 'video/mp4']] }));
    assert.equal(s.status, 200);
    assert.deepEqual(s.data.media.map((m) => [m.name, m.type]), [[`사진${no}.jpg`, 'image'], ['영상.mp4', 'video']]);
  }
  // 허용되지 않는 확장자, 같은 이름 업로드
  assert.equal((await api('PUT', `/api/posts/${id}/slides/1`, form({}, { files: [['x.html', '<script>', 'image/png']] }))).status, 400);
  const dup = await api('PUT', `/api/posts/${id}/slides/1`, form({}, { files: [['사진1.jpg', 'jpg', 'image/jpeg']] }));
  assert.ok(dup.data.media.some((m) => m.name === '사진1(2).jpg'));

  // 파일이 실제로 제공되는지
  const fileRes = await fetch(BASE + dup.data.media.find((m) => m.name === '사진1.jpg').url);
  assert.equal(await fileRes.text(), 'jpg');

  // 2번 삭제 -> 3번이 2번으로 당겨짐
  assert.equal((await api('DELETE', `/api/posts/${id}/slides/2`)).status, 204);
  const detail = (await api('GET', `/api/posts/${id}`)).data;
  assert.deepEqual(detail.slides.map((s) => [s.no, s.text]), [[1, '1번 슬라이드 글'], [2, '3번 슬라이드 글']]);
  assert.deepEqual(detail.category, { main: '키오스크', mid: '병원', sub: '동네병원' });

  // 슬라이드 순서 바꾸기: [2, 1] → 1번이 예전 2번
  assert.equal((await api('PUT', `/api/posts/${id}/slides/order`, { order: [1, 1] })).status, 400);
  assert.equal((await api('PUT', `/api/posts/${id}/slides/order`, { order: [2] })).status, 400);
  assert.equal((await api('PUT', `/api/posts/${id}/slides/order`, { order: [2, 1] })).status, 204);
  const reordered = (await api('GET', `/api/posts/${id}`)).data;
  assert.deepEqual(reordered.slides.map((s) => [s.no, s.text]), [[1, '3번 슬라이드 글'], [2, '1번 슬라이드 글']]);
  assert.equal(reordered.slides[1].media.find((m) => m.name === '사진1.jpg').url, `/files/posts/${id}/2/${encodeURIComponent('사진1.jpg')}`);

  // 경로 조작 차단
  assert.equal((await api('DELETE', `/api/posts/${id}/slides/1/files/text.txt`)).status, 400);
  assert.equal((await api('DELETE', `/api/posts/${id}/slides/1/files/..%2F..%2Fcover.png`)).status, 400);

  // 목록/검색 (상위 분류로 조회해도 포함)
  assert.ok((await api('GET', `/api/posts?categoryId=${cats.find((c) => c.name === '키오스크').id}&q=접수`)).data.some((p) => p.id === id && p.slideCount === 2));

  // 게시글이 있는 분류는 삭제 불가
  assert.equal((await api('DELETE', `/api/categories/${cats.find((c) => c.name === '키오스크').id}`)).status, 409);

  assert.equal((await api('DELETE', `/api/posts/${id}`)).status, 204);
  assert.equal((await api('GET', `/api/posts/${id}`)).status, 404);
  assert.equal((await fetch(BASE + reordered.slides[0].media[0].url)).status, 404);
});

test('공지 폴더', async () => {
  const c = await api('POST', '/api/notices', form({ title: '서비스 안내', date: '2026.10.01', content: '본문\n둘째 줄' }, { files: [['안내문.pdf', '%PDF', 'application/pdf']] }));
  assert.equal(c.status, 201);
  assert.equal(c.data.date, '2026-10-01');
  assert.equal(c.data.content, '본문\n둘째 줄');
  assert.equal(c.data.attachments[0].url, `/files/notices/${c.data.id}/${encodeURIComponent('안내문.pdf')}`);
  const u = await api('PUT', `/api/notices/${c.data.id}`, form({ content: '수정된 본문' }));
  assert.equal(u.data.content, '수정된 본문');
  assert.equal(u.data.title, '서비스 안내');
  assert.equal((await api('POST', '/api/notices', form({ title: 't', date: '어제', content: 'c' }))).status, 400);
  assert.equal((await api('DELETE', `/api/notices/${c.data.id}`)).status, 204);
});

test('배너 순서', async () => {
  const a = (await api('POST', '/api/banners', form({ title: 'A', desc: 'a', color: '#112233' }, { image: [['a.png', 'a', 'image/png']] }))).data;
  const b = (await api('POST', '/api/banners', form({ title: 'B', desc: 'b' }, { image: [['b.png', 'b', 'image/png']] }))).data;
  assert.equal((await api('POST', '/api/banners', form({ title: 'C', desc: 'c' }))).status, 400);
  const ordered = (await api('PUT', '/api/banners/order', { ids: [b.id, a.id] })).data;
  assert.deepEqual(ordered.filter((x) => [a.id, b.id].includes(x.id)).map((x) => x.title), ['B', 'A']);
  await api('DELETE', `/api/banners/${a.id}`);
  await api('DELETE', `/api/banners/${b.id}`);
});

test('건의사항', async () => {
  const c = await api('POST', '/api/suggestions', { content: '글자를 더 크게 해주세요. 화면이 잘 안 보여요.' }, false);
  assert.equal(c.status, 201);
  // 도배 방지: 같은 IP에서 1분 안에 또 보내면 거부
  const again = await api('POST', '/api/suggestions', { content: '또 보냄' }, false);
  assert.equal(again.status, 429);
  assert.match(again.data.error, /1분에 한 번/);
  assert.equal((await api('GET', '/api/suggestions', null, false)).status, 401);
  const list = (await api('GET', '/api/suggestions?status=pending')).data;
  const item = list.items.find((s) => s.id === c.data.id);
  assert.equal(item.title, '글자를 더 크게 해주세요. 화면이 잘 안 보…');
  assert.equal('name' in item, false);
  assert.equal((await api('PATCH', `/api/suggestions/${c.data.id}`, { status: 'done' })).data.status, 'done');
  assert.equal((await api('DELETE', `/api/suggestions/${c.data.id}`)).status, 204);
});

test('음성 안내 키 미설정 안내', async () => {
  const status = (await api('GET', '/api/speech/status', null, false)).data;
  if (status.enabled) return; // 키가 있으면 실제 호출 비용이 들므로 생략
  assert.equal((await api('POST', '/api/speech/tts', { text: '안녕하세요' }, false)).status, 503);
});
