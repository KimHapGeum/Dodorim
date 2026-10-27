import { useEffect, useRef, useState } from 'react';
import Scaler from '../shared/Scaler';
import Modal from '../shared/Modal';
import CardSlot from '../shared/CardSlot';
import { useCardPay } from '../shared/useCardPay';
import { useGuide, useExp } from '../guide/GuideContext';
import { won, tap, beep } from '../shared/utils';

/*
 * 생활용품점 셀프계산대 체험
 * 실제 생활용품점 계산대의 진행 순서를 참고했고, 상호·로고·캐릭터·결제사 로고는 쓰지 않았어요.
 * 순서: 시작하기 → 결제 방법 먼저 고르기 → 봉투 → 상품 스캔 → 멤버십 포인트 → 카드 결제 → 영수증
 */

/* 손님 장바구니 물건 (가격은 체험용) — code: qr(QR코드) / bar(막대형 바코드) */
const BASKET = [
  { id: 'hook', name: '접착식 후크 L자형 (3개입)', short: '접착 후크', price: 1000, emoji: '🪝', code: 'qr', no: '1024853' },
  { id: 'hanger', name: '다용도 접착 걸이 (6개입)', short: '접착 걸이', price: 1000, emoji: '🧷', code: 'qr', no: '1034449' },
  { id: 'sponge', name: '주방 수세미 (3개입)', short: '수세미', price: 1000, emoji: '🧽', code: 'qr', no: '1051207' },
  { id: 'battery', name: '알칼라인 건전지 AA (4개입)', short: '건전지', price: 2000, emoji: '🔋', code: 'qr', no: '1009934' },
  { id: 'tissue', name: '물티슈 (70매)', short: '물티슈', price: 1500, emoji: '🧻', code: 'qr', no: '1068812' },
  { id: 'snack', name: '초코 과자', short: '과자', price: 1500, emoji: '🍫', code: 'bar', no: '8801234' },
];

const BAGS = [
  { id: 's', name: '종이봉투(소)', price: 200, h: 112, w: 90 },
  { id: 'm', name: '종이봉투(중)', price: 200, h: 136, w: 110 },
  { id: 'l', name: '종이봉투(대)', price: 200, h: 160, w: 128 },
];

/* 결제 방법 (실제 결제사 이름·로고 대신 일반 이름) */
const EASY_PAYS = [
  { label: '모바일\n현금카드', glyph: '₩', c: '#4aa3df' },
  { label: '앱카드', glyph: 'APP', c: '#2f3a4f' },
  { label: 'QR 결제', glyph: 'QR', c: '#e9a800' },
  { label: '바코드\n결제', glyph: '▥', c: '#2fae66' },
  { label: '은행 페이', glyph: '🏦', c: '#6b8cff' },
  { label: '교통카드', glyph: '🚇', c: '#ef6c57' },
  { label: '해외 카드', glyph: '🌐', c: '#8a63d2' },
  { label: '해외\n간편결제', glyph: '🌏', c: '#1aa6b7' },
];

const SC_W = 1100; // 그림 전체 너비 (끌기 좌표 계산용)
const SC_H = 940;

/* ───────── (연습하기용) 미션 ───────── */
export const MISSION = {
  title: '생활용품점에서 셀프 계산하기',
  steps: [
    '결제 방법을 카드로 고르세요',
    '봉투(중) 1장을 사세요',
    '장바구니 물건을 모두 스캔하세요',
    '포인트 적립은 안 하고 카드로 결제하세요',
  ],
  checks: [
    { label: '봉투(중) 1장', test: (r) => r.list.some((l) => l.id === 'bag-m' && l.qty === 1) },
    { label: '물건 6개 모두 스캔', test: (r) => BASKET.every((b) => r.list.some((l) => l.id === b.id)) },
    { label: '포인트 적립 안 함', test: (r) => r.member === 'skip' },
    { label: '영수증 받기', test: (r) => r.receipt },
  ],
};

/* ───────── 알아보기 순서 ───────── */
export const TOUR = [
  { sel: 'sign', title: '결제 안내', text: '이 계산대는 카드와 휴대폰 간편결제만 된다는 뜻이에요. 현금은 직원이 있는 계산대를 이용해요.' },
  { sel: 'screen', title: '터치 화면', text: '찍은 물건과 금액이 나오는 화면이에요. 손가락으로 눌러서 사용해요.' },
  { sel: 'basket', title: '내 장바구니', text: '계산할 물건이에요. 꾹 누른 채로 끌어서 스캔대에 하나씩 올려요.' },
  { sel: 'scanzone', title: '스캔대', text: '물건을 올려 두고 QR코드나 바코드를 찍는 곳이에요. 물건에 붙은 작은 가격표에 QR코드가 있어요.' },
  { sel: 'gun', title: '바코드 스캐너', text: '손잡이가 달린 스캐너예요. 꾹 누른 채로 끌어서 스캔대 위 물건에 대면 빨간 빛이 나오고 "삑" 하고 찍혀요.' },
  { sel: 'bag', title: '포장대', text: '계산한 물건을 담는 곳이에요. 찍은 물건은 여기로 옮겨져요.' },
  { sel: 'terminal', title: '카드 단말기', text: '결제할 때 카드를 꽂는 곳이에요. 작은 화면에 금액과 안내가 나와요.' },
  { sel: 'printer', title: '영수증 나오는 곳', text: '계산이 끝나고 "영수증 출력하기"를 누르면 영수증이 여기로 나와요.' },
];

export default function SelfCheckout() {
  const { demo, finish } = useExp();
  const [screen, setScreen] = useState(demo ? 'scan' : 'start');
  const [method, setMethod] = useState('');
  const [bagSel, setBagSel] = useState({});
  const [basket, setBasket] = useState(BASKET);
  const [staged, setStaged] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [list, setList] = useState([]);
  const [selRow, setSelRow] = useState(null);
  const [bagged, setBagged] = useState([]);
  const [modal, setModal] = useState(null); // {type:'notice', text} | 'staff' | 'pickfirst' | 'qty' | 'bag'
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [drag, setDrag] = useState(null); // { kind: 'item' | 'gun', item, x, y, over }
  const timers = useRef([]);
  const scRef = useRef(null);
  const zoneRef = useRef(null);
  const scanTimer = useRef(null);

  const total = list.reduce((s, l) => s + l.price * l.qty, 0);
  const count = list.reduce((s, l) => s + l.qty, 0);
  const card = useCardPay(() => setScreen('done'));

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(scanTimer.current);
    },
    []
  );
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const go = (s) => {
    tap();
    setScreen(s);
  };
  const notice = (text) => {
    tap();
    setModal({ type: 'notice', text });
  };

  const resetAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setScreen('start');
    setMethod('');
    setBagSel({});
    setBasket(BASKET);
    setStaged(null);
    setScanning(false);
    setList([]);
    setSelRow(null);
    setBagged([]);
    setModal(null);
    setPhone('');
    setMember('');
    card.reset();
  };

  const addLine = (line) => {
    setList((ls) => {
      const f = ls.find((l) => l.id === line.id);
      if (f) return ls.map((l) => (l.id === line.id ? { ...l, qty: l.qty + line.qty } : l));
      return [...ls, line];
    });
  };

  /* 봉투 사기 */
  const buyBags = () => {
    tap();
    BAGS.forEach((b) => {
      const n = bagSel[b.id] || 0;
      if (n > 0) addLine({ id: `bag-${b.id}`, name: b.name, price: b.price, qty: n, no: '0000200' });
    });
    setBagSel({});
    if (modal === 'bag') setModal(null);
    else setScreen('scan');
  };

  /* 장바구니 물건을 스캔대에 올리기 */
  const pickUp = (p) => {
    if (screen !== 'scan' || scanning || modal) return;
    tap();
    if (staged) setBasket((b) => [...b, staged]);
    setStaged(p);
    setBasket((b) => b.filter((x) => x.id !== p.id));
  };

  /* 스캐너로 찍기 */
  const shoot = () => {
    if (screen !== 'scan' || scanning || modal) return;
    if (!staged) {
      tap();
      setModal('pickfirst');
      return;
    }
    const item = staged;
    setScanning(true);
    later(() => {
      beep(1800, 0.12, 0.1);
      addLine({ id: item.id, name: item.name, price: item.price, qty: 1, no: item.no });
      setBagged((b) => [...b, item]);
      setStaged(null);
      setScanning(false);
    }, 450);
  };

  /* ───────── 끌어서 놓기 (마우스 · 손가락 모두) ─────────
     - 장바구니 물건을 끌어서 '스캔대'에 놓으면 올라가요.
     - 바코드 스캐너를 끌어서 스캔대 위 물건에 대면 "삑" 하고 찍혀요.
     - 끌지 않고 한 번 누르기만 해도 동작해요. */
  const live = useRef({});
  live.current = { screen, staged, scanning, modal, pickUp, shoot };

  const toLocal = (cx, cy) => {
    const r = scRef.current.getBoundingClientRect();
    const k = r.width / SC_W;
    return { x: (cx - r.left) / k, y: (cy - r.top) / k };
  };
  const overZone = (cx, cy) => {
    const z = zoneRef.current && zoneRef.current.getBoundingClientRect();
    return !!z && cx >= z.left && cx <= z.right && cy >= z.top && cy <= z.bottom;
  };

  const startDrag = (e, kind, item) => {
    const L = live.current;
    if (L.screen !== 'scan' || L.modal || L.scanning) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    let scannedNow = false;
    setDrag({ kind, item, ...toLocal(sx, sy), over: false });

    const move = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      const over = overZone(ev.clientX, ev.clientY);
      const pos = toLocal(ev.clientX, ev.clientY);
      setDrag((d) => (d ? { ...d, ...pos, over } : d));
      if (kind === 'gun') {
        const st = live.current.staged;
        if (over && st && !scannedNow && !live.current.scanning) {
          // 스캐너를 물건 위에 잠깐 대고 있으면 찍혀요
          if (!scanTimer.current)
            scanTimer.current = setTimeout(() => {
              scanTimer.current = null;
              scannedNow = true;
              live.current.shoot();
            }, 300);
        } else if (!over && scanTimer.current) {
          clearTimeout(scanTimer.current);
          scanTimer.current = null;
        }
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
      const over = overZone(ev.clientX, ev.clientY);
      setDrag(null);
      if (kind === 'item') {
        if (!moved || over) live.current.pickUp(item);
      } else if (!scannedNow && (!moved || over)) {
        live.current.shoot();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  /* 화면 오른쪽 목록 편집 */
  const deleteRow = () => {
    if (!selRow) {
      notice('지울 상품을 목록에서 먼저 눌러 고른 뒤 "−" 버튼을 누르세요.');
      return;
    }
    tap();
    setList((ls) => ls.filter((l) => l.id !== selRow));
    const back = BASKET.find((b) => b.id === selRow);
    if (back) {
      setBagged((b) => b.filter((x) => x.id !== back.id));
      setBasket((b) => [...b, back]);
    }
    setSelRow(null);
    beep(500, 0.1, 0.06);
  };
  const changeQty = (d) => {
    tap();
    setList((ls) => ls.map((l) => (l.id === selRow ? { ...l, qty: Math.max(1, l.qty + d) } : l)));
  };

  const finishAll = (print) => {
    tap();
    if (print) {
      beep(700, 0.5, 0.05);
      setReceipt({ total, count });
    }
    finish({ list, member, receipt: print, method });
    resetAll();
  };

  const allScanned = basket.length === 0 && !staged;
  const firstPick = basket[0];

  /* ───────── 도우미 안내 ───────── */
  let guide;
  if (modal && modal.type === 'notice') guide = '안내창이에요. 내용을 읽고 "확인"을 눌러 주세요.';
  else if (modal === 'pickfirst') guide = '먼저 장바구니 물건을 끌어서 스캔대에 올려 주세요. 그다음 스캐너를 물건에 가져다 대요.';
  else if (modal === 'staff') guide = '도움이 필요하면 "직원호출"을 누르면 직원이 와요. "확인"을 눌러 주세요.';
  else if (modal === 'qty') guide = '같은 물건을 여러 개 살 때 + − 로 개수를 바꿔요. 다 되면 "확인"을 누르세요.';
  else if (modal === 'bag') guide = '필요한 봉투를 눌러 고르고 "봉투 구매하기"를 누르세요. 한 번 더 누르면 장수가 늘어나요.';
  else
    guide = {
      start: '셀프 계산대예요. 화면의 빨간 "시작하기" 버튼을 눌러 보세요.',
      method: '이 계산대는 물건을 찍기 전에 돈 낼 방법을 먼저 골라요. 카드로 내려면 왼쪽 위 카드 그림을 누르세요.',
      bag: '봉투가 필요하면 봉투 그림을 눌러 고르고 아래 빨간 버튼을 누르세요. 필요 없으면 바로 "봉투 구매 안함"을 누르세요.',
      scan: scanning
        ? '"삑!" 바코드를 읽고 있어요.'
        : staged
          ? '물건이 스캔대에 올라갔어요. 이제 오른쪽 검은 "바코드 스캐너"를 꾹 누른 채로 끌어서, 스캔대 위 물건에 가져다 대 보세요.'
          : !allScanned
            ? '왼쪽 아래 장바구니의 물건을 꾹 누른 채로 끌어서, 가운데 "스캔대"에 놓아 보세요.'
            : '물건을 다 찍었어요! 화면의 개수와 금액을 확인하고 빨간 "결제하기"를 눌러 주세요.',
      member:
        phone.length >= 10
          ? '번호를 다 누르셨어요. "포인트 적립하기"를 누르세요.'
          : '포인트를 쌓으려면 휴대폰 번호를 누르세요. 적립하지 않으려면 빨간 "포인트 적립 안함"을 누르세요.',
      card: {
        ready: '오른쪽 카드 단말기 아래쪽에 카드를 꽂아야 해요. 반짝이는 카드를 눌러 꽂아 보세요.',
        processing: '결제 중이에요. 카드를 빼지 말고 기다려 주세요.',
        remove: '결제가 끝났어요! 카드를 눌러서 빼 주세요.',
        done: '',
        idle: '',
      }[card.st],
      done: '결제가 끝났어요! 영수증이 필요하면 "영수증 출력하기"를 누르세요. 카드, 지갑, 휴대폰, 물건을 꼭 챙기세요.',
    }[screen];
  const on = useGuide(guide);
  const hl = (cond) => (on && cond ? ' hl' : '');

  const termText = {
    idle: ['DODREAM PAY', ''],
    ready: ['카드를 넣어주세요', won(total)],
    processing: ['승인 중입니다', '카드를 빼지 마세요'],
    remove: ['승인 완료', '카드를 빼주세요'],
    done: ['감사합니다', ''],
  }[card.st];

  const backBtn = (to) => (
    <button
      className="ds-back"
      onClick={() => {
        tap();
        to();
      }}
      aria-label="이전"
    >
      ←
    </button>
  );
  const cctvBanner = (
    <div className="ds-cctv">
      <span>
        <small>고객의 안전과 도난 방지를 위해</small>
        <b>
          24시간 <em>CCTV</em> 녹화중!
        </b>
      </span>
      <span className="ds-cctv-cam">📹</span>
    </div>
  );
  const phishBanner = (
    <div className="ds-phish">
      공공기관이라며 이체 · 현금인출을 요구하면 <b>100% 보이스피싱!</b>
    </div>
  );

  const bagPicker = (
    <div className="ds-bags">
      {BAGS.map((b) => {
        const n = bagSel[b.id] || 0;
        return (
          <button
            key={b.id}
            className={`ds-bag${n ? ' on' : ''}`}
            onClick={() => {
              tap();
              setBagSel((s) => ({ ...s, [b.id]: ((s[b.id] || 0) + 1) % 4 }));
            }}
          >
            <span className="ds-bagpic" style={{ width: b.w, height: b.h }}>
              <span className="ds-bag-handle" />
              <span className="ds-bag-grid" />
            </span>
            {n > 0 && <span className="ds-bag-count">{n}장</span>}
            <span className="ds-bag-label">
              {b.name}
              <br />
              {won(b.price)}
            </span>
          </button>
        );
      })}
    </div>
  );

  /* 스캔 화면 (멤버십 · 카드 단계에서도 뒤에 깔려 보여요) */
  const scanView = (
    <div className="ds-scan">
      <div className="ds-scan-left">
        <button
          className="ds-staff"
          onClick={() => {
            tap();
            setModal('staff');
          }}
        >
          <span>🔔</span>직원호출
        </button>
        <h2 className="ds-scan-title">
          상품의 <mark>QR코드</mark>를
          <br />
          스캔해주세요.
        </h2>
        <div className="ds-bubble">
          쇼핑봉투가 필요하시면 <b>&lsquo;유상 봉투&rsquo;</b>를 눌러 주세요
        </div>
        <div className="ds-howto" aria-hidden="true">
          <span className="ds-tag">
            <small>가격표</small>
            <b>1,000원</b>
            <i>▥▥▥</i>
          </span>
          <span className="ds-qr">
            {Array.from({ length: 25 }).map((_, i) => (
              <span key={i} className={[0, 1, 3, 4, 5, 7, 9, 12, 15, 17, 19, 20, 21, 23, 24].includes(i) ? 'on' : ''} />
            ))}
          </span>
          <span className="ds-howto-gun">
            <span className="ds-howto-beam" />
          </span>
        </div>
        <div className="ds-barnote">
          식품 및 일부 화장품류는 <b>막대형 바코드</b> <span>▥▥▥</span> 스캔
        </div>
        <div className="ds-scan-foot">
          {backBtn(() => setScreen('bag'))}
          {cctvBanner}
        </div>
      </div>
      <div className="ds-scan-right">
        <div className="ds-listwrap">
          <div className="ds-list">
            {list.map((l, i) => (
              <button
                key={l.id}
                className={`ds-row${selRow === l.id ? ' on' : ''}`}
                onClick={() => {
                  tap();
                  setSelRow(selRow === l.id ? null : l.id);
                }}
              >
                <span className="ds-row-name">
                  {i + 1}. {l.name}
                  <small>[{l.no}]</small>
                </span>
                <span className="ds-row-qty">{l.qty}개</span>
                <b>{won(l.price * l.qty)}</b>
              </button>
            ))}
          </div>
          <div className="ds-side">
            <button
              className="ds-side-btn dark"
              onClick={() => {
                tap();
                setBagSel({});
                setModal('bag');
              }}
            >
              유상
              <br />
              봉투
            </button>
            <button
              className="ds-side-btn"
              onClick={() => {
                if (!selRow) {
                  notice('개수를 바꿀 상품을 목록에서 먼저 눌러 고르세요.');
                  return;
                }
                tap();
                setModal('qty');
              }}
              aria-label="수량 변경"
            >
              🖩
            </button>
            <button className="ds-side-btn" onClick={deleteRow} aria-label="선택한 상품 지우기">
              −
            </button>
          </div>
        </div>
        <div className="ds-sum">
          <span>수량</span>
          <b>{count} 개</b>
        </div>
        <div className="ds-sum">
          <span>총 결제금액</span>
          <b>{total.toLocaleString('ko-KR')} 원</b>
        </div>
        <button
          className={`ds-pay${hl(screen === 'scan' && allScanned && !scanning && !modal)}`}
          disabled={!list.length || scanning}
          onClick={() => {
            setPhone('');
            go('member');
          }}
        >
          결제하기
        </button>
      </div>
    </div>
  );

  const renderScreen = () => {
    switch (screen) {
      case 'start':
        return (
          <div className="ds-page ds-start">
            {cctvBanner}
            <p className="ds-start-note">
              <b>쇼핑봉투</b>가 필요하시면 계산 중 <b>&lsquo;유상 봉투&rsquo;</b>를 눌러 주세요
            </p>
            <div className="ds-start-row">
              <span className="ds-start-title">셀프 계산</span>
              <button className={`ds-start-btn${hl(true)}`} onClick={() => go('method')}>
                시작하기
              </button>
            </div>
            <div className="ds-langs">
              {[
                ['cn', '汉语'],
                ['jp', '日本語'],
                ['en', 'English'],
              ].map(([k, label]) => (
                <button key={k} className="ds-lang" onClick={() => notice('체험은 한국어로만 할 수 있어요.')}>
                  <span className={`ds-flag ${k}`}>{k === 'en' ? 'EN' : ''}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="ds-start-foot">온라인 두드림몰에서도 쇼핑하세요!</div>
          </div>
        );

      case 'method':
        return (
          <div className="ds-page ds-method">
            <h2 className="ds-h2 underline">상품 등록 전 결제 방법을 선택해 주세요</h2>
            <div className="ds-method-body">
              <div className="ds-method-left">
                <button
                  className={`ds-paytile${hl(true)}`}
                  onClick={() => {
                    setMethod('card');
                    go('bag');
                  }}
                >
                  <span className="ds-cardpic">
                    <span className="ds-cardpic-top">Card</span>
                    <span className="ds-cardpic-chip" />
                    <span className="ds-cardpic-no">1234 5678 1234 5678</span>
                  </span>
                  신용/체크/현금IC 카드
                </button>
                <button
                  className="ds-paytile"
                  onClick={() => notice('휴대폰 결제는 휴대폰 뒷면을 카드 단말기에 대면 돼요. 이번 체험에서는 카드로 해 볼게요.')}
                >
                  <span className="ds-phonepic">
                    <span>Pay</span>
                  </span>
                  휴대폰 결제
                </button>
                <button
                  className="ds-paytile"
                  onClick={() => notice('포인트는 계산할 때 멤버십 앱 QR코드로 쓸 수 있어요. 이번 체험에서는 카드로 해 볼게요.')}
                >
                  <span className="ds-pointpic">P</span>
                  포인트 사용
                </button>
                <div className="ds-gift">
                  <button onClick={() => notice('상품권은 상품권 바코드를 스캐너에 찍어서 써요. 이번 체험에서는 카드로 해 볼게요.')}>
                    상품권사용
                  </button>
                  <button onClick={() => notice('상품권에 남은 돈을 확인하는 버튼이에요.')}>상품권 잔액조회</button>
                </div>
              </div>
              <div className="ds-easypays">
                {EASY_PAYS.map((p) => (
                  <button
                    key={p.label}
                    className="ds-easy"
                    onClick={() =>
                      notice('간편결제는 휴대폰 앱의 바코드나 QR코드를 스캐너에 비춰서 내요. 이번 체험에서는 카드로 해 볼게요.')
                    }
                  >
                    <span className="ds-easy-icon" style={{ background: p.c }}>
                      {p.glyph}
                    </span>
                    <span className="ds-easy-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ds-foot">
              {backBtn(() => setScreen('start'))}
              {phishBanner}
            </div>
          </div>
        );

      case 'bag':
        return (
          <div className="ds-page ds-bagpage">
            <h2 className="ds-h2">봉투가 필요하세요?</h2>
            {bagPicker}
            <div className="ds-foot">
              {backBtn(() => setScreen('method'))}
              {phishBanner}
              <button className={`ds-redbtn${hl(true)}`} onClick={buyBags}>
                {Object.values(bagSel).some((n) => n > 0) ? '봉투 구매하기' : '봉투 구매 안함'}
              </button>
            </div>
          </div>
        );

      case 'scan':
      case 'member':
      case 'card':
        return scanView;

      case 'done':
        return (
          <div className="ds-page ds-done">
            {phishBanner}
            <h2 className="ds-done-title">
              결제가 완료 되었습니다.
              <br />
              <u>영수증 출력하시겠습니까?</u>
            </h2>
            <p className="ds-done-sub">
              교환/환불은 14일 이내 영수증 지참 후
              <br />
              구입 매장에서 가능합니다.
            </p>
            <div className="ds-done-btns">
              <button className={`ds-redbtn${hl(true)}`} onClick={() => finishAll(false)}>
                처음으로
              </button>
              <button className={`ds-navybtn${hl(true)}`} onClick={() => finishAll(true)}>
                영수증 출력하기
              </button>
            </div>
            <div className="ds-check">
              <span className="ds-check-warn">
                <b>!</b>잠깐! 꼭 챙겨주세요.
              </span>
              <span className="ds-check-items">
                <span>
                  <i>💳</i>카드
                </span>
                <span>
                  <i>👛</i>지갑
                </span>
                <span>
                  <i>📱</i>휴대폰
                </span>
                <span>
                  <i>🛍️</i>쇼핑백
                </span>
              </span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  /* 멤버십 · 카드 · 기타 팝업 */
  const renderOverlay = () => {
    if (screen === 'member') {
      return (
        <div className="ds-overlay">
          <div className="ds-member">
            <h3 className="ds-member-title">두드림 멤버십 포인트</h3>
            <div className="ds-member-body">
              <div className="ds-member-left">
                <p className="ds-member-lead">
                  <mark>멤버십 포인트</mark> 적립과
                  <br />
                  사용이 가능합니다.
                </p>
                <p className="ds-member-how">
                  1. 휴대폰 번호를 입력하거나
                  <br />
                  2. 멤버십 앱 QR코드를 스캔해주세요.
                </p>
                <span className="ds-member-phone" aria-hidden="true">
                  📱
                </span>
              </div>
              <div className="ds-member-right">
                <div className="ds-member-input">
                  {phone.replace(/^(\d{3})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join('-'))}
                </div>
                <div className="ds-numpad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '010'].map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        tap();
                        if (k === '지움') setPhone((p) => p.slice(0, -1));
                        else setPhone((p) => (p + k).slice(0, 11));
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="ds-member-warn">※ 포인트 사용은 멤버십 앱 QR코드 스캔 시에만 사용 가능합니다.</div>
            <div className="ds-foot">
              {backBtn(() => setScreen('scan'))}
              {cctvBanner}
              {phone.length >= 10 ? (
                <button
                  className={`ds-redbtn${hl(true)}`}
                  onClick={() => {
                    setMember('save');
                    beep(1200, 0.12);
                    go('card');
                    card.start();
                  }}
                >
                  포인트 적립하기
                </button>
              ) : (
                <button
                  className={`ds-redbtn${hl(true)}`}
                  onClick={() => {
                    setMember('skip');
                    go('card');
                    card.start();
                  }}
                >
                  포인트 적립 안함
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (screen === 'card') {
      return (
        <div className="ds-overlay">
          <div className="ds-cardpay">
            <p className="ds-cardpay-sum">
              결제하실 금액 <b>{won(total)}</b>
            </p>
            {card.st === 'processing' ? <div className="spinner" /> : <div className="ds-cardpay-pic">💳</div>}
            <h3>
              {card.st === 'ready' && '카드를 단말기에 꽂아 주세요'}
              {card.st === 'processing' && '결제 중입니다. 카드를 빼지 마세요'}
              {card.st === 'remove' && '결제 완료! 카드를 빼 주세요'}
            </h3>
            {(card.st === 'ready' || card.st === 'remove') && <div className="arrow-right">오른쪽 카드 단말기 ▶</div>}
          </div>
        </div>
      );
    }
    if (!modal) return null;
    const okBtn = (
      <button
        className={`ds-navybtn${hl(true)}`}
        onClick={() => {
          tap();
          setModal(null);
        }}
      >
        확인
      </button>
    );
    if (modal.type === 'notice')
      return (
        <Modal>
          <p className="ds-modal-text">{modal.text}</p>
          {okBtn}
        </Modal>
      );
    if (modal === 'pickfirst')
      return (
        <Modal>
          <p className="ds-modal-text">
            스캔대에 상품이 없어요.
            <br />
            장바구니에서 상품을 끌어서 스캔대에 올려 주세요.
          </p>
          {okBtn}
        </Modal>
      );
    if (modal === 'staff')
      return (
        <Modal>
          <p className="ds-modal-text">
            🔔 직원을 호출했습니다.
            <br />
            잠시만 기다려 주세요.
          </p>
          {okBtn}
        </Modal>
      );
    if (modal === 'qty') {
      const row = list.find((l) => l.id === selRow);
      return (
        <Modal>
          <p className="ds-modal-text">{row && row.name}</p>
          <div className="ds-qty">
            <button onClick={() => changeQty(-1)} aria-label="하나 빼기">
              −
            </button>
            <b>{row ? row.qty : 0}개</b>
            <button onClick={() => changeQty(1)} aria-label="하나 더하기">
              +
            </button>
          </div>
          {okBtn}
        </Modal>
      );
    }
    if (modal === 'bag')
      return (
        <div className="ds-overlay">
          <div className="ds-member ds-bagmodal">
            <h3 className="ds-member-title">봉투가 필요하세요?</h3>
            {bagPicker}
            <div className="ds-foot">
              {backBtn(() => setModal(null))}
              <span className="ds-spacer" />
              <button className={`ds-redbtn${hl(Object.values(bagSel).some((n) => n > 0))}`} onClick={buyBags}>
                봉투 구매하기
              </button>
            </div>
          </div>
        </div>
      );
    return null;
  };

  return (
    <Scaler width={SC_W} height={SC_H}>
      <div className="sc ds" ref={scRef}>
        <div className="sc-wall" />
        {/* 모니터 */}
        <div className="ds-monitor">
          <div className="ds-sign" data-tour="sign">
            <b>카드 · 간편결제 전용</b>
            <span>현금 결제는 일반 계산대를 이용해 주세요</span>
          </div>
          <div className="ds-bezel">
            <div className="scr ds-screen" data-tour="screen">
              {renderScreen()}
              {renderOverlay()}
            </div>
          </div>
          <div className="ds-neck" />
        </div>
        {/* 받침대 (프린터) */}
        <div className="ds-pedestal">
          <div className="ds-sticker">📹 셀프계산대 전용 CCTV 촬영 중입니다</div>
          <div className="sc-printer" data-tour="printer">
            <div className="sc-printer-area">
              {receipt && (
                <button
                  className={`v-receipt${hl(true)}`}
                  onClick={() => {
                    tap();
                    setReceipt(null);
                  }}
                  aria-label="영수증 가져가기"
                >
                  <b>두드림 생활마트</b>
                  <span>{receipt.count}개</span>
                  <span>{won(receipt.total)}</span>
                </button>
              )}
            </div>
            <div className="sc-printer-slot" />
            <span className="hw-label dark">영수증 나오는 곳</span>
          </div>
        </div>
        {/* 카드 단말기 */}
        <div className="ds-terminal" data-tour="terminal">
          <div className="sc-arm" />
          <div className="sc-term-body">
            <div className="sc-term-screen">
              <b>{termText[0]}</b>
              <span>{termText[1]}</span>
            </div>
            <div className="sc-term-keys">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <CardSlot st={card.st} onClick={card.clickCard} highlight={on} dir="up" label="" className="sc-card" />
          </div>
          <span className="sc-pen" />
        </div>
        {/* 바코드 스캐너 (손잡이형) */}
        <div className="ds-gun-wrap" data-tour="gun">
          {drag && drag.kind === 'gun' ? (
            <div className="sc-gun-holder">
              스캐너
              <br />
              거치대
            </div>
          ) : (
            <button
              className={`sc-gun${scanning ? ' firing' : ''}${hl(!!staged && !scanning && screen === 'scan' && !modal)}`}
              onPointerDown={(e) => startDrag(e, 'gun')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') shoot();
              }}
              aria-label="바코드 스캐너 (끌어서 물건에 대기)"
            >
              <span className="sc-gun-head" />
              <span className="sc-gun-grip" />
              {scanning && <span className="sc-beam" />}
            </button>
          )}
          <span className="hw-label dark">바코드 스캐너</span>
        </div>
        {/* 계산대 위 */}
        <div className="sc-counter">
          <div className="sc-basket" data-tour="basket">
            <div className="sc-zone-title">🧺 내 장바구니</div>
            <div className="sc-basket-items">
              {basket.length === 0 && <div className="sc-zone-empty">비었어요</div>}
              {basket.map((p) => (
                <button
                  key={p.id}
                  className={`sc-goods${screen !== 'scan' ? ' dim' : ''}${
                    drag && drag.kind === 'item' && drag.item.id === p.id ? ' dragging' : ''
                  }${hl(screen === 'scan' && !staged && !scanning && !modal && !drag && firstPick && p.id === firstPick.id)}`}
                  onPointerDown={(e) => startDrag(e, 'item', p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') pickUp(p);
                  }}
                >
                  <span className="sc-goods-emoji">{p.emoji}</span>
                  <span className="sc-goods-name">{p.short}</span>
                  <span className={`ds-code ${p.code}`}>{p.code === 'qr' ? 'QR' : '▌▍▌▌▍▌'}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sc-scanzone" data-tour="scanzone" ref={zoneRef}>
            <div className="sc-zone-title">스캔대</div>
            <div
              className={`sc-scanzone-pad${scanning ? ' lit' : ''}${drag ? ' target' : ''}${drag && drag.over ? ' over' : ''}`}
            >
              {staged ? (
                <span className="sc-staged">
                  <span>{staged.emoji}</span>
                  <small>{staged.short}</small>
                  <span className={`ds-code ${staged.code}`}>{staged.code === 'qr' ? 'QR' : '▌▍▌▌▍▌'}</span>
                </span>
              ) : (
                <span className="sc-zone-empty">여기에 물건을 끌어다 놓아요</span>
              )}
            </div>
          </div>
          <div className="sc-bag" data-tour="bag">
            <div className="sc-zone-title">📦 포장대</div>
            <div className="sc-bag-items">
              {bagged.length === 0 && <div className="sc-zone-empty">계산한 물건이 놓여요</div>}
              {bagged.map((p) => (
                <span key={p.id} className="sc-bagged" title={p.name}>
                  {p.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 끌고 있는 물건 · 스캐너 */}
        {drag && drag.kind === 'item' && (
          <div className="sc-ghost item" style={{ left: drag.x, top: drag.y }}>
            <span>{drag.item.emoji}</span>
            <small>{drag.item.short}</small>
          </div>
        )}
        {drag && drag.kind === 'gun' && (
          <div className={`sc-ghost gun${drag.over ? ' over' : ''}`} style={{ left: drag.x, top: drag.y }}>
            <span className="sc-gun-head" />
            <span className="sc-gun-grip" />
            <span className={`sc-ghost-beam${drag.over || scanning ? ' on' : ''}`} />
          </div>
        )}
      </div>
    </Scaler>
  );
}
