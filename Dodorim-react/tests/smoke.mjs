// 전체 흐름 클릭 테스트 (프론트 + 백엔드 + DB)
// 실행: 백엔드 서버(빌드된 화면 포함)를 켠 뒤
//   BASE_URL=http://localhost:3000 ADMIN_USERNAME=admin ADMIN_PASSWORD=... npm run test:smoke
// 주의: 테스트용 강의/공지/배너/분류/건의를 만듭니다. 운영 서버에서는 실행하지 마세요.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const BASE = (process.env.BASE_URL || 'http://localhost:3000') + '/#';
const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
assert.ok(ADMIN_USERNAME && ADMIN_PASSWORD, 'ADMIN_USERNAME, ADMIN_PASSWORD 환경변수가 필요합니다.');

// 업로드용 1x1 PNG
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dodorim-'));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const file = (name) => { const p = path.join(tmp, name); fs.writeFileSync(p, png); return p; };

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
// 화면 공통 팝업(src/dialog.jsx)이 뜨면 문구를 기록하고 [확인]을 누름
const dialogs = [];
await page.exposeFunction('__dialog', (m) => dialogs.push(m));
await page.evaluateOnNewDocument(() => {
  new MutationObserver(() => {
    const ok = document.querySelector('.dd-dialog-btn.ok');
    if (!ok) return;
    window.__dialog(document.getElementById('dd-dialog-message').textContent);
    ok.click();
  }).observe(document, { childList: true, subtree: true, characterData: true });
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = async (sel, text) => {
  for (let i = 0; i < 20; i++) {
    const ok = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text)); if (el) el.click(); return !!el; }, sel, text);
    if (ok) { await wait(250); return; }
    await wait(150);
  }
  assert.fail(`not found: ${sel} "${text}"`);
};
const text = (sel) => page.$eval(sel, (e) => e.textContent.trim());
const waitText = async (sel, expected) => {
  for (let i = 0; i < 30; i++) {
    if ((await page.$(sel)) && (await text(sel)).includes(expected)) return;
    await wait(150);
  }
  assert.fail(`${sel} 에 "${expected}" 없음: ${await page.$(sel) ? await text(sel) : '(요소 없음)'}`);
};
const selectByText = (sel, label) => page.$eval(sel, (el, label) => {
  const opt = [...el.options].find((o) => o.textContent === label);
  el.value = opt.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, label);
const lastDialog = () => dialogs.at(-1);
// 단원 선택 화면: 한 쪽에 3개, 원하는 카드가 나올 때까지 오른쪽 화살표
const pagedClick = async (gridSel, label) => {
  for (let i = 0; i < 30; i++) {
    if ((await page.$(gridSel)) && (await text(gridSel)).includes(label)) { await clickText(`${gridSel} > *`, label); return; }
    const next = await page.$('.select-arrow.next');
    if (next && await next.evaluate((b) => b.style.visibility !== 'hidden')) await next.click();
    await wait(150);
  }
  assert.fail(`카드 없음: ${label}`);
};
const uniq = Date.now().toString().slice(-6);

// 1) 메인: 등록된 공지/배너가 없으면 기본값
await page.goto(BASE + '/');
await waitText('.notice-text', '');
assert.ok(await page.$('.slide img'));

// 2) 관리자 로그인 (틀린 비밀번호 → 오류 메시지)
await page.goto(BASE + '/manager');
await wait(300);
assert.ok(page.url().endsWith('/login'), '로그인 없이 관리자 화면 접근 차단');
await page.type('#id', ADMIN_USERNAME); await page.type('#password', 'wrong-password');
await clickText('.btn-login', '로그인'); await wait(300);
assert.equal(lastDialog(), '아이디 또는 비밀번호가 올바르지 않습니다.');
await page.$eval('#password', (e) => { e.value = ''; });
await page.type('#password', ADMIN_PASSWORD);
await clickText('.btn-login', '로그인'); await wait(500);
assert.ok(page.url().endsWith('/manager'));

// 3) 새 강의: 키오스크 > 병원 > 동네병원, 슬라이드 2장 (메인 소개 없음)
await clickText('.add-btn', '신규 강의');
await wait(300);
await selectByText('.select-box:nth-of-type(1)', '키오스크'); await wait(100);
await selectByText('.select-box:nth-of-type(2)', '병원'); await wait(100);
await selectByText('.select-box:nth-of-type(3)', '동네병원');
const lectureTitle = `접수 연습 ${uniq}`;
await page.type('.form-area input.text-input', lectureTitle);
await clickText('.btn-next', '다음 단계');
await clickText('.content-add-more', '');
await page.type('.modal textarea', '첫 화면에서 접수하기를 누르세요.');
await (await page.$('.modal input[type=file]')).uploadFile(file('화면1.png'), file('화면2.png'));
await wait(200);
assert.equal((await page.$$('.modal img')).length, 2, '사진 미리보기 2장');
await clickText('.modal .btn-next', '추가하기');
await clickText('.content-add-more', '');
await page.type('.modal textarea', '주민등록번호를 입력하세요.');
await clickText('.modal .btn-next', '추가하기');
assert.equal((await page.$$('.item-card')).length, 2);
await clickText('.btn-next', '새 강의 등록 완료'); await wait(800);
assert.equal(lastDialog(), '새로운 강의 목록 등록이 완벽하게 완료되었습니다!');
await waitText('#categoryGroupContainer', lectureTitle);

// 4) 학습자 화면: 병원 → 동네병원 → 강의 → 슬라이드
await page.goto(BASE + '/hospital');
await clickText('.card', '동네병원');
await waitText('.lecture-list-container', lectureTitle);
assert.equal(await text('#brand-title'), '동네병원 강의 학습 목록');
await clickText('.lecture-row-card', lectureTitle);
await waitText('.page-indicator', '1 / 2');
await waitText('#lectureDesc', '첫 화면에서 접수하기를 누르세요.');
assert.ok((await page.$eval('#screenArea img', (e) => e.src)).includes('/files/posts/'));
assert.equal((await page.$$('#screenArea img')).length, 2);
await clickText('.font-control-button', '글자 크게');
assert.equal(await page.$eval('#lectureDesc', (e) => e.style.fontSize), '22px');
await clickText('.next-btn', '');
await waitText('#lectureDesc', '주민등록번호를 입력하세요.');
await clickText('.next-btn', ''); await wait(300);
assert.equal(lastDialog(), '강의 학습 목록으로 넘어가시겠습니까?');
assert.ok(page.url().includes('/screen_list?'));

// 5) 수정: 슬라이드 1 삭제 → 번호 당겨짐, 제목 변경
await page.goto(BASE + '/manager');
await clickText('.category-header', '키오스크 > 병원');
await clickText('.content-item:has(h3) .edit-icon', '');
await waitText('.section-title', '슬라이드');
assert.equal(await page.$eval('.form-area input.text-input', (e) => e.value), lectureTitle);
await page.$$eval('.item-card .delete-btn', (b) => b[0].click());
await wait(800);
await waitText('.item-card .item-desc', '주민등록번호를 입력하세요.');
assert.equal((await page.$$('.item-card')).length, 1);
await page.type('.form-area input.text-input', ' (수정)');
await clickText('.btn-next', '수정 내용 저장'); await wait(500);
assert.equal(lastDialog(), '수정 내용이 저장되었습니다.');
await waitText('#categoryGroupContainer', `${lectureTitle} (수정)`);

// 6) 단원 관리: 폴더 트리에서 대단원 → 중단원 → 소단원 추가, 수정, 삭제
const newMain = `새대단원${uniq}`, newMid = `새중단원${uniq}`, newSub = `새소단원${uniq}`;
const unitRow = (name) => page.evaluateHandle((name) => [...document.querySelectorAll('.unit-row')].find((r) => r.querySelector('h3').firstChild.textContent === name), name);
const addUnit = async (parent, name, desc) => {
  if (parent) await (await unitRow(parent)).asElement().$eval('.unit-add', (b) => b.click());
  else await clickText('.add-btn', '대단원 추가');
  await page.waitForSelector('.modal-box');
  await page.type('.modal-box input[type=text]', name);
  await page.type('.modal-box textarea', desc);
  await (await page.$('.modal-box input[type=file]')).uploadFile(file('아이콘.png'));
  await clickText('.btn-save', '저장');
  await waitText('.unit-tree', name);
};
await clickText('.menu-btn', '단원 관리');
await waitText('.unit-tree', '키오스크');
await addUnit('키오스크', `테스트중단원${uniq}`, '중단원 설명');
await addUnit(null, newMain, '대단원 설명');
await addUnit(newMain, newMid, '중단원 설명');
await addUnit(newMid, newSub, '소단원 설명');
// 설명 입력은 30자·2줄까지
await (await unitRow(newSub)).asElement().$eval('.edit-icon', (b) => b.click());
await page.waitForSelector('.modal-box');
assert.equal(await page.$eval('.modal-box input[type=text]', (e) => e.value), newSub);
await page.$eval('.modal-box textarea', (e) => { e.value = ''; });
await page.type('.modal-box textarea', '가'.repeat(40));
assert.equal((await page.$eval('.modal-box textarea', (e) => e.value)).length, 30);
await page.$eval('.modal-box textarea', (e) => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(e, ''); e.dispatchEvent(new Event('input', { bubbles: true })); });
await page.type('.modal-box textarea', '수정한 설명');
await clickText('.btn-save', '저장');
await waitText('.unit-tree', '수정한 설명');
// 삭제: 강의가 있는 단원은 막고, 빈 단원은 삭제
await (await unitRow('키오스크')).asElement().$eval('.delete-icon', (b) => b.click()); await wait(300);
assert.ok(lastDialog().includes('삭제할 수 없습니다'), lastDialog());
await addUnit(newMid, `지울소단원${uniq}`, '');
await (await unitRow(`지울소단원${uniq}`)).asElement().$eval('.delete-icon', (b) => b.click()); await wait(600);
assert.ok(!(await text('.unit-tree')).includes(`지울소단원${uniq}`), '빈 단원 삭제');
// 강의 목록 관리에도 새 대단원 반영
await clickText('.menu-btn', '강의 목록 관리');
await waitText('#categoryGroupContainer', `${newMain} > ${newMid}`);
await waitText('#categoryGroupContainer', `키오스크 > 테스트중단원${uniq}`);

await page.goto(BASE + '/select_topic');
await waitText('.select-page', '1 /');
assert.equal((await page.$$('.topic-container .card')).length, 3, '한 쪽 최대 3개');
assert.equal(await page.$eval('.select-arrow.prev', (b) => b.style.visibility), 'hidden', '첫 쪽은 왼쪽 화살표 숨김');
await pagedClick('.topic-container', newMain);
await waitText('.lecture-grid', newMid);
assert.ok(page.url().includes('/units?id='));
assert.ok(await page.$eval('.lecture-grid img', (e) => e.src.includes('/files/categories/')), '중단원 아이콘');
// 올린 아이콘은 기존 단원 아이콘(글자 아이콘, 칸의 font-size)과 같은 크기
assert.ok(await page.$eval('.lecture-grid img.unit-icon', (e) => Math.abs(e.getBoundingClientRect().height - parseFloat(getComputedStyle(e.parentElement).fontSize)) < 1), '아이콘 크기가 기존 아이콘과 다름');
await pagedClick('.lecture-grid', newMid);
await waitText('.lecture-grid', newSub);
assert.ok(page.url().includes('/places?id='));
await pagedClick('.lecture-grid', newSub);
await waitText('#brand-title', `${newSub} 강의 학습 목록`);
await waitText('.lecture-list-container', '아직 등록된 강의가 없습니다.');
// 소단원 화면도 카드가 가로 한 줄 (화면별 CSS의 칸 설정에 밀리지 않는지), 카드 크기는 대단원 카드와 같은지
await page.goto(BASE + '/select_topic'); await waitText('.select-grid', '');
const cardSize = () => page.$$eval('.select-grid > *', (cs) => [...new Set(cs.map((c) => `${c.offsetWidth}x${c.offsetHeight}`))]);
const [mainSize] = await cardSize();
for (const r of ['/food', '/public_edu', '/hospital', '/kiosk_edu', '/self_check', '/atm']) {
  await page.goto(BASE + r); await waitText('.select-grid', '');
  await wait(300);
  const tops = await page.$$eval('.select-grid > *', (cs) => cs.map((c) => Math.round(c.getBoundingClientRect().top)));
  // 카드 등장 애니메이션(위로 떠오름) 중이라 몇 px 차이는 허용
  assert.ok(tops.length > 1 && Math.max(...tops) - Math.min(...tops) < 50, `${r} 카드가 가로 한 줄이 아님: ${tops}`);
  assert.deepEqual(await cardSize(), [mainSize], `${r} 카드 크기가 대단원 카드(${mainSize})와 다름`);
}
await page.goto(BASE + '/kiosk_edu');
await pagedClick('.location-container', `테스트중단원${uniq}`);
assert.ok(page.url().includes('/places?id='));
await page.goto(BASE + '/manager');

// 7) 공지 등록 → 메인 공지바
await clickText('.menu-btn', '공지사항');
await clickText('.add-btn', '신규');
await page.type('.modal-box input[type=text]', `새 공지 ${uniq}`);
// 날짜 입력칸은 OS 언어에 따라 입력 순서가 달라서 값을 직접 넣음 (React가 알 수 있게 input 이벤트 발생)
await page.$eval('.modal-box input[type=date]', (e) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, '2099-12-31');
  e.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.type('.modal-box textarea', '공지 내용');
await clickText('.btn-save', '저장');
await waitText('.content-list', `새 공지 ${uniq}`);

// 8) 배너 등록 → 메인 슬라이더
await clickText('.menu-btn', '배너');
await clickText('.add-btn', '신규 등록');
await page.type('.modal-box input[type=text]', `배너 ${uniq}`);
await page.type('.modal-box textarea', '배너 설명');
await (await page.$('.modal-box input[type=file]')).uploadFile(file('배너.png'));
await clickText('.btn-save', '저장');
await waitText('.content-list', `배너 ${uniq}`);

await clickText('.logout-btn', '로그아웃'); await wait(300);
await waitText('.notice-text', `새 공지 ${uniq}`);
assert.ok(await page.$$eval('.slide img', (imgs) => imgs.some((i) => i.src.includes('/files/banners/'))));

// 9) 건의하기 → 관리자 건의사항
await page.goto(BASE + '/food');
await clickText('.btn-suggestion', '건의');
await page.type('.suggestion-textarea', `테스트 건의 ${uniq}`);
await clickText('.btn-submit', ''); await wait(300);
assert.equal(lastDialog(), '건의해주셔서 감사합니다.');
await page.goto(BASE + '/login');
await page.type('#id', ADMIN_USERNAME); await page.type('#password', ADMIN_PASSWORD);
await clickText('.btn-login', '로그인'); await wait(500);
await clickText('.menu-btn', '건의사항');
await waitText('.content-list', `테스트 건의 ${uniq}`);

console.log('dialogs:', dialogs);
assert.deepEqual(errors, []);
console.log('ALL PASS');
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
