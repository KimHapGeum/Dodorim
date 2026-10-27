import { useEffect, useRef, useState } from 'react';
import Scaler from '../shared/Scaler';
import Modal from '../shared/Modal';
import CardSlot from '../shared/CardSlot';
import FoodPic from '../shared/FoodPic';
import { useCardPay } from '../shared/useCardPay';
import { useGuide, useExp } from '../guide/GuideContext';
import { won, tap, beep } from '../shared/utils';

/*
 * 테이블형 키오스크 체험 (가상의 '두드림 식당' · '두드림 오더')
 * 실제 식당 테이블 주문기의 진행 순서를 참고했고, 회사 이름·로고·메뉴 사진은 쓰지 않았어요.
 * 순서: 대기화면 → 메뉴 고르기(왼쪽 메뉴 목록) → 장바구니에 담기 → 장바구니 → 주문하기
 *       → 결제방법(카드 / 현금 / 나눠 내기) → 할부 → 주의 안내 → 카드 읽히기 → 서명 → 주문 완료
 */

const won0 = (n) => n.toLocaleString('ko-KR');

/* ───────── 메뉴 ───────── */
const CATS = [
  ['jeon', '전 · 부침'],
  ['set', '세트메뉴'],
  ['meal', '식사 메뉴'],
  ['stew', '찌개 · 탕'],
  ['meat', '고기'],
  ['alcohol', '주류'],
  ['drink', '음료'],
  ['dessert', '후식'],
];

const ITEMS = [
  { id: 11, cat: 'jeon', name: '해물파전', price: 16000, emoji: '🥞', bg: '#efd9a6', desc: '오징어, 새우를 듬뿍 넣은 파전', best: true },
  { id: 17, cat: 'jeon', name: '김치전', price: 14000, emoji: '🥞', bg: '#f2c3ad', desc: '잘 익은 김치로 부친 바삭한 전', best: true },
  { id: 18, cat: 'jeon', name: '모둠전', price: 19000, emoji: '🍳', bg: '#f6e3a8', desc: '동그랑땡, 호박전, 육전을 한 접시에', best: true },
  { id: 10, cat: 'jeon', name: '계란말이', price: 9000, emoji: '🍳', bg: '#f6e3a8', desc: '폭신한 계란말이' },
  { id: 19, cat: 'set', name: '점심 정식 세트', price: 13000, emoji: '🍱', bg: '#ead2bd', desc: '불고기 + 밥 + 국 + 반찬 (점심 한정)', best: true },
  { id: 20, cat: 'set', name: '2인 고기 세트', price: 39000, emoji: '🍖', bg: '#eec3a8', desc: '돼지갈비 2인분 + 된장찌개 + 공기밥 2' },
  { id: 4, cat: 'meal', name: '제육볶음', price: 11000, emoji: '🥘', bg: '#f0bfa6', desc: '매콤달콤한 돼지고기 볶음' },
  { id: 5, cat: 'meal', name: '돌솥비빔밥', price: 10000, emoji: '🍚', bg: '#e8dcc0', desc: '갖은 나물과 고추장' },
  { id: 6, cat: 'meal', name: '불고기 정식', price: 13000, emoji: '🍱', bg: '#ead2bd', desc: '불고기와 밥, 국, 반찬' },
  { id: 21, cat: 'meal', name: '물냉면', price: 10000, emoji: '🍜', bg: '#dfe9f2', desc: '시원한 육수의 물냉면' },
  { id: 22, cat: 'meal', name: '비빔냉면', price: 10000, emoji: '🍜', bg: '#f4cdbf', desc: '새콤달콤 매콤한 비빔냉면' },
  { id: 9, cat: 'meal', name: '공기밥', price: 1000, emoji: '🍚', bg: '#ece8df', desc: '갓 지은 밥 한 공기' },
  { id: 1, cat: 'stew', name: '김치찌개', price: 9000, emoji: '🍲', bg: '#f3c9b4', desc: '돼지고기를 듬뿍 넣은 얼큰한 찌개', best: true },
  { id: 2, cat: 'stew', name: '된장찌개', price: 9000, emoji: '🍲', bg: '#e9d6b5', desc: '구수한 집된장으로 끓였어요' },
  { id: 3, cat: 'stew', name: '부대찌개 (2인)', price: 22000, emoji: '🥘', bg: '#f2c3ad', desc: '햄과 소시지가 가득' },
  { id: 7, cat: 'meat', name: '돼지갈비 (1인분)', price: 15000, emoji: '🍖', bg: '#eec3a8', desc: '2인분부터 주문할 수 있어요', min: 2 },
  { id: 8, cat: 'meat', name: '삼겹살 (1인분)', price: 15000, emoji: '🥓', bg: '#f1cdbd', desc: '2인분부터 주문할 수 있어요', min: 2 },
  { id: 14, cat: 'alcohol', name: '맥주', price: 5000, emoji: '🍺', bg: '#f6e3a3', desc: '500ml 병' },
  { id: 15, cat: 'alcohol', name: '소주', price: 5000, emoji: '🍶', bg: '#d9efe6', desc: '360ml 병' },
  { id: 23, cat: 'alcohol', name: '막걸리', price: 6000, emoji: '🍶', bg: '#efece4', desc: '750ml 병' },
  { id: 12, cat: 'drink', name: '콜라', price: 3000, emoji: '🥤', bg: '#d9e6f5', desc: '355ml 캔' },
  { id: 13, cat: 'drink', name: '사이다', price: 3000, emoji: '🥤', bg: '#d8f0e3', desc: '355ml 캔' },
  { id: 24, cat: 'drink', name: '식혜', price: 3000, emoji: '🍵', bg: '#efe4cf', desc: '시원한 전통 식혜' },
  { id: 16, cat: 'dessert', name: '아이스 홍시', price: 4000, emoji: '🍅', bg: '#f6d2b8', desc: '꽁꽁 얼린 달콤한 홍시' },
];

const CALL_ITEMS = ['물', '앞접시', '수저 · 젓가락', '물티슈', '앞치마', '직원만 호출'];
const INSTALLS = ['일시불', '3개월', '4개월', '5개월', '6개월'];
const TABLE_NO = '12';
const SIGN_OVER = 50000; // 이 금액 이상이면 서명을 받아요

/* ───────── (연습하기용) 미션 ───────── */
export const MISSION = {
  title: '식당 테이블에서 주문하고 카드로 결제하기',
  steps: ['해물파전 1개, 김치찌개 1개, 공기밥 2개', '직원호출로 물 요청', '카드결제 · 일시불로 결제'],
  checks: [
    { label: '해물파전 1개', test: (r) => r.orders.some((o) => o.name === '해물파전' && o.qty === 1) },
    { label: '김치찌개 1개', test: (r) => r.orders.some((o) => o.name === '김치찌개' && o.qty === 1) },
    { label: '공기밥 2개', test: (r) => r.orders.some((o) => o.name === '공기밥' && o.qty === 2) },
    { label: '직원호출로 물 요청', test: (r) => r.calls.includes('물') },
    { label: '카드 일시불 결제', test: (r) => r.method === 'card' && r.install === '일시불' },
  ],
};

/* ───────── 알아보기 순서 ───────── */
export const TOUR = [
  { sel: 'screen', title: '주문용 태블릿', text: '식탁 위에 놓인 주문 기계예요. 직원을 부르지 않고 이 화면으로 주문하고 계산까지 해요.' },
  { sel: 'cats', title: '메뉴 목록', text: '왼쪽 세로 목록은 메뉴 종류예요. 누르면 그 메뉴가 있는 곳으로 화면이 움직여요. 주황색이 지금 보고 있는 곳이에요.' },
  { sel: 'item', title: '메뉴 사진', text: '먹고 싶은 메뉴 사진을 누르면 "장바구니에 담으시겠습니까?" 창이 떠요. BEST는 인기 메뉴라는 뜻이에요.' },
  { sel: 'table', title: '테이블 번호', text: '내가 앉은 자리 번호예요. 주문하면 이 번호로 음식이 나와요.' },
  { sel: 'call', title: '직원호출', text: '물, 앞접시, 수저가 필요하거나 도움이 필요할 때 직원을 불러요.' },
  { sel: 'history', title: '주문내역', text: '지금까지 주문한 음식과 금액을 볼 수 있어요.' },
  { sel: 'orderbtn', title: '주문하기', text: '담은 메뉴를 확인하고 주문·결제하는 버튼이에요. 동그라미 숫자는 담은 개수예요.' },
  { sel: 'card', title: '카드 리더기', text: '태블릿 아래에 붙은 카드 꽂는 곳이에요. 결제할 때 카드를 여기에 꽂아요.' },
];

/* 서명 패드 (손가락이나 마우스로 그려요) */
function SignPad({ onInk }) {
  const ref = useRef(null);
  const [has, setHas] = useState(false);
  const drawing = useRef(false);
  const inked = useRef(false);
  const pos = (e) => {
    const c = ref.current;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };
  const down = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = ref.current.getContext('2d');
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1b2a4a';
    ctx.beginPath();
    ctx.moveTo(...pos(e));
    ref.current.setPointerCapture && ref.current.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.lineTo(...pos(e));
    ctx.stroke();
    if (!inked.current) {
      inked.current = true;
      setHas(true);
      onInk(true);
    }
  };
  const up = () => {
    drawing.current = false;
  };
  const clear = () => {
    tap();
    const c = ref.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    inked.current = false;
    setHas(false);
    onInk(false);
  };
  return (
    <div className="so-signwrap">
      <canvas
        ref={ref}
        className="so-signpad"
        width={420}
        height={170}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      {!has && <span className="so-sign-hint">여기에 서명해 주세요.</span>}
      <button className="so-sign-clear" onClick={clear}>
        다시 쓰기
      </button>
    </div>
  );
}

export default function TableOrder() {
  const { demo, finish } = useExp();
  const [started, setStarted] = useState(demo);
  const [cat, setCat] = useState('jeon');
  const [detail, setDetail] = useState(null); // { item, qty }
  const [cart, setCart] = useState([]);
  const [panel, setPanel] = useState(null);
  // panel: cart | pay | install | confirm | cashconfirm | dutch | paying | sign | done | history | call | called | notice
  const [orders, setOrders] = useState([]);
  const [callSel, setCallSel] = useState([]);
  const [calls, setCalls] = useState([]);
  const [method, setMethod] = useState('');
  const [install, setInstall] = useState('');
  const [split, setSplit] = useState(1);
  const [people, setPeople] = useState(2);
  const [payNo, setPayNo] = useState(1);
  const [signed, setSigned] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [toast, setToast] = useState('');
  const listRef = useRef(null);
  const secRefs = useRef({});
  const timers = useRef([]);
  const lastResult = useRef(null);

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const orderedTotal = orders.reduce((s, c) => s + c.price * c.qty, 0);
  const perPerson = Math.ceil(total / split / 10) * 10;
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  /* 결제가 끝나면: 주문을 주방으로 보내고 완료 화면 */
  const completeOrder = (m) => {
    beep(1200, 0.2);
    const next = orders.map((o) => ({ ...o }));
    cart.forEach((c) => {
      const f = next.find((o) => o.id === c.id);
      if (f) f.qty += c.qty;
      else next.push({ ...c });
    });
    setOrders(next);
    lastResult.current = { orders: next, calls, method: m, install, split };
    setCart([]);
    setPanel('done');
  };

  const card = useCardPay(() => {
    if (split > 1 && payNo < split) {
      setPayNo((n) => n + 1);
      later(() => card.start(), 500);
    } else if (split === 1 && total >= SIGN_OVER) {
      setSigned(false);
      setPanel('sign');
    } else completeOrder(split > 1 ? 'dutch' : 'card');
  });

  const close = () => {
    tap();
    setPanel(null);
  };
  const notice = (text) => {
    tap();
    setNoticeText(text);
  };

  /* 메뉴 목록 이동 */
  const jumpTo = (id) => {
    tap();
    setCat(id);
    const box = listRef.current;
    const sec = secRefs.current[id];
    if (box && sec) box.scrollTo({ top: sec.offsetTop - 6, behavior: 'smooth' });
  };
  const onScroll = () => {
    const box = listRef.current;
    if (!box) return;
    let cur = CATS[0][0];
    CATS.forEach(([id]) => {
      const sec = secRefs.current[id];
      if (sec && sec.offsetTop - 40 <= box.scrollTop) cur = id;
    });
    if (cur !== cat) setCat(cur);
  };

  /* 장바구니 */
  const addToCart = () => {
    const { item, qty } = detail;
    setCart((cs) => {
      const f = cs.find((c) => c.id === item.id);
      if (f) return cs.map((c) => (c.id === item.id ? { ...c, qty: c.qty + qty } : c));
      return [...cs, { ...item, qty }];
    });
    setDetail(null);
    beep(1000, 0.08, 0.08);
    setToast(`${item.name} ${qty}개를 담았어요`);
  };
  const changeQty = (id, d) => {
    tap();
    // 최소 개수보다 줄이면 장바구니에서 빠져요
    setCart((cs) => cs.map((c) => (c.id === id ? { ...c, qty: c.qty + d } : c)).filter((c) => c.qty >= (c.min || 1)));
  };
  const openCart = () => {
    tap();
    setPanel('cart');
  };

  /* 결제 */
  const startCard = () => {
    tap();
    setPanel('paying');
    setPayNo(1);
    card.start();
  };

  /* ───────── 도우미 안내 ───────── */
  let guide;
  if (!started) guide = '식탁 위에 놓인 주문 기계예요. 화면 아무 곳이나 눌러서 시작해 보세요.';
  else if (noticeText) guide = '안내창이에요. 내용을 읽고 "확인"을 눌러 주세요.';
  else if (detail)
    guide = `"장바구니에 담으시겠습니까?" 하고 묻는 창이에요.${detail.item.min ? ' 이 메뉴는 2인분부터 주문할 수 있어요.' : ''} + − 로 개수를 정하고 주황색 "담기"를 누르세요.`;
  else
    guide = {
      cart: cart.length
        ? '장바구니예요. 개수가 맞는지 보시고 아래 주황색 "주문하기"를 누르세요. 빼고 싶으면 − 를 누르세요.'
        : '장바구니가 비어 있어요. 오른쪽 위 ✕ 를 눌러 닫고 메뉴를 먼저 골라 주세요.',
      pay: '돈을 낼 방법을 골라요. 카드로 내려면 "카드결제", 여럿이 나눠 내려면 "나눠 내기"를 누르세요.',
      install: '할부를 고르는 창이에요. 한 번에 다 내려면 "일시불"을 누르세요. 잘 모르면 일시불을 고르면 돼요.',
      confirm: '카드로 결제하면 주문을 바꾸거나 취소하기 어렵다는 안내예요. 주문이 맞으면 "예"를 누르세요.',
      cashconfirm: '현금은 식사 후 카운터에서 내요. 주문만 먼저 보내려면 "예"를 누르세요.',
      dutch: '몇 명이 똑같이 나눠 낼지 + − 로 정하고 "결제하기"를 누르세요.',
      paying:
        card.st === 'ready'
          ? `${split > 1 ? `${payNo}번째 분 차례예요. ` : ''}태블릿 바로 아래 "카드 리더기"에 카드를 꽂아요. 반짝이는 카드를 눌러 꽂아 보세요.`
          : card.st === 'processing'
            ? '카드를 읽고 있어요. 카드를 빼지 말고 잠시만 기다려 주세요.'
            : card.st === 'remove'
              ? '결제가 됐어요! 카드를 눌러서 빼 주세요.'
              : '다음 분 차례예요.',
      sign: signed
        ? '서명을 다 하셨으면 "확인"을 누르세요.'
        : '5만 원 이상은 서명이 필요해요. 네모 칸 안에 손가락(마우스)으로 이름을 쓰듯 그려 보세요.',
      done: '주문이 주방으로 들어갔어요! "확인"을 누르면 메뉴 화면으로 돌아가요. 음식이 나올 때까지 기다리시면 돼요.',
      history: '지금까지 주문한 음식이에요. 다 보셨으면 "닫기"를 누르세요.',
      call: '필요한 것을 눌러 고르세요. 여러 개를 골라도 돼요. 다 고르셨으면 "호출하기"를 누르세요.',
      called: '직원에게 알림이 갔어요. "확인"을 누르세요.',
    }[panel] ||
    (cart.length
      ? '메뉴가 담겼어요. 더 고르셔도 되고, 오른쪽 아래 주황색 "주문하기"를 눌러 장바구니를 열어도 돼요.'
      : orders.length
        ? '주문이 끝났어요. 물이나 앞접시가 필요하면 위쪽 "직원호출"을 눌러 보세요.'
        : '왼쪽 목록에서 메뉴 종류를 고르고, 먹고 싶은 메뉴 사진을 눌러 보세요. "해물파전"부터 눌러 볼까요?');
  const on = useGuide(guide);
  const hl = (cond) => (on && cond ? ' hl' : '');

  let firstMarked = false;

  const renderPanel = () => {
    switch (panel) {
      case 'cart':
      case 'pay':
      case 'install':
      case 'confirm':
      case 'cashconfirm':
      case 'dutch':
        return (
          <>
            <div className="so-dim" onClick={panel === 'cart' ? close : undefined} />
            <aside className="so-cart">
              <div className="so-cart-head">
                <b>장바구니 ({count})</b>
                <button
                  className={`so-toggle${cart.length ? '' : ' off'}`}
                  onClick={() => {
                    tap();
                    setCart([]);
                  }}
                >
                  장바구니 비우기 <span />
                </button>
                <button className="so-x" onClick={close} aria-label="닫기">
                  ✕
                </button>
              </div>
              <div className="so-cart-list">
                {cart.length === 0 && <div className="so-empty">담은 메뉴가 없어요</div>}
                {cart.map((c) => (
                  <div className="so-cart-row" key={c.id}>
                    <b>{c.name}</b>
                    <div className="so-cart-line">
                      <span className="so-qty">
                        <button onClick={() => changeQty(c.id, -1)} aria-label="하나 빼기">
                          −
                        </button>
                        <b>{c.qty}</b>
                        <button onClick={() => changeQty(c.id, 1)} aria-label="하나 더하기">
                          +
                        </button>
                      </span>
                      <span>{won0(c.price * c.qty)}원</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="so-cart-sum">
                <span>총 금액</span>
                <b>{won0(total)}원</b>
              </div>
              <button
                className={`so-cart-order${hl(panel === 'cart' && cart.length > 0)}`}
                disabled={!cart.length}
                onClick={() => {
                  tap();
                  setPanel('pay');
                }}
              >
                주문하기
              </button>
            </aside>
            {panel !== 'cart' && renderPayLayer()}
          </>
        );
      case 'paying':
        return (
          <Modal className="so-box">
            <div className="so-box-title">결제진행</div>
            {split > 1 && (
              <div className="so-paystep">
                {Array.from({ length: split }).map((_, i) => (
                  <span key={i} className={i + 1 < payNo ? 'done' : i + 1 === payNo ? 'on' : ''}>
                    {i + 1 < payNo ? '✔ 완료' : `${i + 1}번째`}
                  </span>
                ))}
              </div>
            )}
            <p className="so-box-text">
              {card.st === 'ready' && '카드를 읽혀주세요'}
              {card.st === 'processing' && '카드를 읽고 있습니다'}
              {card.st === 'remove' && '카드를 빼주세요'}
              {card.st === 'done' && '다음 분 카드를 준비해 주세요'}
            </p>
            {card.st === 'processing' ? (
              <div className="spinner orange" />
            ) : (
              <div className="so-insert" aria-hidden="true">
                {/* 투입구 위쪽만 보이게 잘라서, 카드가 구멍 속으로 들어가는 것처럼 보여요 */}
                <span className="so-insert-clip">
                  <span className="so-insert-card" />
                </span>
                <span className="so-insert-slot" />
              </div>
            )}
            <p className="so-box-sub">결제 금액 {won(split > 1 ? perPerson : total)}</p>
            {(card.st === 'ready' || card.st === 'remove') && <div className="arrow-down">▼ 태블릿 아래 카드 리더기 ▼</div>}
            {card.st === 'ready' && payNo === 1 && (
              <button
                className="so-btn ghost small"
                onClick={() => {
                  tap();
                  card.reset();
                  setPanel('pay');
                }}
              >
                닫기
              </button>
            )}
          </Modal>
        );
      case 'sign':
        return (
          <Modal className="so-box wide">
            <div className="so-box-title">서명을 해주세요</div>
            <p className="so-box-sub left">결제금액 {won0(total)}</p>
            <SignPad onInk={setSigned} />
            <div className="so-btnrow">
              <button
                className={`so-btn main${hl(signed)}`}
                disabled={!signed}
                onClick={() => {
                  tap();
                  completeOrder('card');
                }}
              >
                확인
              </button>
            </div>
          </Modal>
        );
      case 'done':
        return (
          <Modal className="so-box">
            <div className="ok-circle">✓</div>
            <div className="so-box-title big">주문이 완료되었습니다</div>
            <p className="so-box-text small">
              맛있게 준비해서 {TABLE_NO}번 테이블로 가져다 드릴게요.
              {method === 'cash' && (
                <>
                  <br />
                  결제는 식사 후 카운터에서 해 주세요.
                </>
              )}
            </p>
            <button
              className={`so-btn main${hl(true)}`}
              onClick={() => {
                tap();
                setPanel(null);
                if (lastResult.current) {
                  finish(lastResult.current);
                  lastResult.current = null;
                }
              }}
            >
              확인
            </button>
          </Modal>
        );
      case 'history':
        return (
          <Modal className="so-box wide">
            <div className="so-box-title">주문내역</div>
            <div className="so-history">
              {orders.length === 0 ? (
                <div className="so-empty">아직 주문한 메뉴가 없어요</div>
              ) : (
                orders.map((o) => (
                  <div className="so-history-row" key={o.id}>
                    <span>{o.name}</span>
                    <span>{o.qty}개</span>
                    <b>{won0(o.price * o.qty)}원</b>
                  </div>
                ))
              )}
            </div>
            <div className="so-cart-sum inbox">
              <span>총 주문 금액</span>
              <b>{won0(orderedTotal)}원</b>
            </div>
            <button className={`so-btn main${hl(true)}`} onClick={close}>
              닫기
            </button>
          </Modal>
        );
      case 'call':
        return (
          <Modal className="so-box wide">
            <div className="so-box-title">무엇이 필요하세요?</div>
            <div className="so-call-grid">
              {CALL_ITEMS.map((n) => (
                <button
                  key={n}
                  className={`so-chip${callSel.includes(n) ? ' on' : ''}${hl(!callSel.length && n === '물')}`}
                  onClick={() => {
                    tap();
                    setCallSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
                  }}
                >
                  {callSel.includes(n) ? '✔ ' : ''}
                  {n}
                </button>
              ))}
            </div>
            <div className="so-btnrow">
              <button className="so-btn ghost" onClick={close}>
                취소
              </button>
              <button
                className={`so-btn main${hl(callSel.length > 0)}`}
                disabled={!callSel.length}
                onClick={() => {
                  beep(1300, 0.15);
                  setCalls((c) => [...c, ...callSel]);
                  setPanel('called');
                }}
              >
                호출하기
              </button>
            </div>
          </Modal>
        );
      case 'called':
        return (
          <Modal className="so-box">
            <div className="so-bigicon">🔔</div>
            <div className="so-box-title">직원을 호출했습니다</div>
            <p className="so-box-text small">{callSel.join(', ')} 요청이 전달되었어요.</p>
            <button className={`so-btn main${hl(true)}`} onClick={close}>
              확인
            </button>
          </Modal>
        );
      default:
        return null;
    }
  };

  /* 결제방법 · 할부 · 주의 안내 (장바구니 위에 뜨는 창) */
  const renderPayLayer = () => (
    <div className="so-paylayer">
      <div className="so-paybox">
        <div className="so-paybox-head">
          <b>주문</b>
          <span>결제방법을 선택하세요</span>
          <button
            className="so-x dark"
            onClick={() => {
              tap();
              setPanel('cart');
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="so-paymethods">
          <button
            className={`so-pm${hl(panel === 'pay')}`}
            onClick={() => {
              tap();
              setMethod('card');
              setSplit(1);
              setPanel('install');
            }}
          >
            <span className="so-pm-icon card" />
            카드결제
          </button>
          <button
            className="so-pm"
            onClick={() => {
              tap();
              setMethod('cash');
              setSplit(1);
              setPanel('cashconfirm');
            }}
          >
            <span className="so-pm-icon cash">₩</span>
            현금결제
          </button>
          <button
            className="so-pm"
            onClick={() => {
              tap();
              setMethod('dutch');
              setPeople(2);
              setPanel('dutch');
            }}
          >
            <span className="so-pm-icon pie" />
            나눠 내기
          </button>
        </div>

        {panel === 'install' && (
          <div className="so-install">
            {INSTALLS.map((m) => (
              <button
                key={m}
                className={`${m === '일시불' ? 'first' : ''}${hl(m === '일시불')}`}
                onClick={() => {
                  tap();
                  setInstall(m);
                  setPanel('confirm');
                }}
              >
                {m}
              </button>
            ))}
            <span className="so-install-note">※ 5만 원 미만은 할부가 되지 않을 수 있어요</span>
          </div>
        )}

        {panel === 'dutch' && (
          <div className="so-dutch">
            <b>몇 명이 나눠 내시나요?</b>
            <div className="so-qty big">
              <button
                onClick={() => {
                  tap();
                  setPeople((p) => Math.max(2, p - 1));
                }}
                aria-label="한 명 빼기"
              >
                −
              </button>
              <b>{people}명</b>
              <button
                onClick={() => {
                  tap();
                  setPeople((p) => Math.min(6, p + 1));
                }}
                aria-label="한 명 더하기"
              >
                +
              </button>
            </div>
            <span>한 사람당 {won(Math.ceil(total / people / 10) * 10)}</span>
            <button
              className={`so-btn main${hl(true)}`}
              onClick={() => {
                tap();
                setSplit(people);
                setInstall('일시불');
                setPanel('confirm');
              }}
            >
              결제하기
            </button>
          </div>
        )}

        {(panel === 'confirm' || panel === 'cashconfirm') && (
          <div className="so-confirm">
            <p>
              {panel === 'confirm' ? (
                <>
                  카드결제 후 주문변경 및 카드변경/취소가 불가합니다.
                  <br />
                  <small>주문을 진행하시겠습니까?</small>
                </>
              ) : (
                <>
                  현금결제는 식사 후 카운터에서 해 주세요.
                  <br />
                  <small>주문을 먼저 보내시겠습니까?</small>
                </>
              )}
            </p>
            <div className="so-btnrow">
              <button
                className={`so-btn red${hl(true)}`}
                onClick={() => {
                  if (panel === 'confirm') startCard();
                  else {
                    tap();
                    completeOrder('cash');
                  }
                }}
              >
                ✔ 예
              </button>
              <button
                className="so-btn sky"
                onClick={() => {
                  tap();
                  setPanel('pay');
                }}
              >
                ✕ 아니오
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="so-paytotal">
        총 결제 금액 <b>{won0(total)}원</b>
      </div>
    </div>
  );

  return (
    <Scaler width={1100} height={860}>
      <div className="so">
        <div className="so-tablet">
          <span className="so-cam" />
          <div className="scr so-screen" data-tour="screen">
            {!started ? (
              <button
                className="so-idle"
                onClick={() => {
                  tap();
                  setStarted(true);
                }}
              >
                <span className="so-idle-main">
                  <span className="so-idle-gauge" aria-hidden="true">
                    ⏱
                  </span>
                  <span className="so-idle-sub">기 다 리 지 말 고</span>
                  <span className="so-idle-title">
                    <em>간편</em>하게
                    <br />
                    주문하세요
                  </span>
                  <span className={`so-idle-touch${hl(true)}`}>👆 화면을 눌러 주세요</span>
                </span>
                <span className="so-idle-steps">
                  <span className="so-idle-brand">두드림 오더</span>
                  {[
                    ['👆', '화면터치'],
                    ['🍽️', '메뉴선택'],
                    ['💳', '결제/주문확인'],
                    ['✅', '주문완료'],
                  ].map(([ic, t], i) => (
                    <span key={t} className="so-idle-step">
                      {i > 0 && <i>⌄</i>}
                      <span className="so-idle-icon">{ic}</span>
                      {t}
                    </span>
                  ))}
                </span>
              </button>
            ) : (
              <div className="so-main">
                <nav className="so-side" data-tour="cats">
                  <div className="so-logo">
                    <span>D</span>두드림 오더
                  </div>
                  {CATS.map(([id, name]) => (
                    <button key={id} className={`so-cat${cat === id ? ' on' : ''}`} onClick={() => jumpTo(id)}>
                      {name}
                    </button>
                  ))}
                </nav>
                <section className="so-content">
                  <div className="so-top">
                    <button className="so-pill" onClick={() => notice('체험은 한국어로만 할 수 있어요.')}>
                      LANG ▾
                    </button>
                    <button
                      className={`so-pill${hl(orders.length > 0 && !cart.length && !calls.length && !panel)}`}
                      data-tour="call"
                      onClick={() => {
                        tap();
                        setCallSel([]);
                        setPanel('call');
                      }}
                    >
                      🔔 직원호출
                    </button>
                    <div className="so-table" data-tour="table">
                      <small>테이블 번호</small>
                      <b>{TABLE_NO}</b>
                    </div>
                  </div>
                  <div className="so-list" ref={listRef} onScroll={onScroll}>
                    {CATS.map(([id, name]) => (
                      <div
                        key={id}
                        className="so-sec"
                        ref={(el) => {
                          secRefs.current[id] = el;
                        }}
                      >
                        <h3 className="so-sec-title">{name}</h3>
                        <div className="so-grid">
                          {ITEMS.filter((i) => i.cat === id).map((it) => {
                            const mark = !firstMarked;
                            firstMarked = true;
                            return (
                              <button
                                key={it.id}
                                className={`so-item${hl(!cart.length && !orders.length && !panel && it.id === 11)}`}
                                data-tour={mark ? 'item' : undefined}
                                onClick={() => {
                                  tap();
                                  setDetail({ item: it, qty: it.min || 1 });
                                }}
                              >
                                <span className="so-item-pic">
                                  <FoodPic emoji={it.emoji} bg={it.bg} size={54} photo={`table-${it.id}`} />
                                  {it.best && <span className="so-best">BEST</span>}
                                </span>
                                <span className="so-item-name">{it.name}</span>
                                <span className="so-item-price">{won0(it.price)}원</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="so-bottom">
                    <button
                      className="so-histbtn"
                      data-tour="history"
                      onClick={() => {
                        tap();
                        setPanel('history');
                      }}
                    >
                      주문내역
                    </button>
                    <button className={`so-orderbtn${hl(cart.length > 0 && !panel)}`} data-tour="orderbtn" onClick={openCart}>
                      주문하기 <span>{count}</span>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {detail && (
              <div className="so-detail-wrap">
                <div className="so-detail">
                  <button
                    className="so-x dark"
                    onClick={() => {
                      tap();
                      setDetail(null);
                    }}
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                  <div className="so-detail-left">
                    <FoodPic emoji={detail.item.emoji} bg={detail.item.bg} size={100} className="so-detail-pic" photo={`table-${detail.item.id}`} />
                    <b>{detail.item.name}</b>
                    <small>{detail.item.desc}</small>
                  </div>
                  <div className="so-detail-right">
                    <span className="so-carticon" aria-hidden="true">
                      🛒
                    </span>
                    <p>장바구니에 담으시겠습니까?</p>
                    <div className="so-qty big">
                      <button
                        onClick={() => {
                          tap();
                          setDetail({ ...detail, qty: Math.max(detail.item.min || 1, detail.qty - 1) });
                        }}
                        aria-label="하나 빼기"
                      >
                        −
                      </button>
                      <b>{detail.qty}</b>
                      <button
                        onClick={() => {
                          tap();
                          setDetail({ ...detail, qty: detail.qty + 1 });
                        }}
                        aria-label="하나 더하기"
                      >
                        +
                      </button>
                    </div>
                    {detail.item.min && <span className="so-warn">※ {detail.item.min}인분 이상 주문할 수 있어요</span>}
                  </div>
                  <div className="so-detail-foot">
                    <b>{won0(detail.item.price * detail.qty)}원</b>
                    <button className={`so-add${hl(true)}`} onClick={addToCart}>
                      담기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {renderPanel()}

            {noticeText && (
              <Modal className="so-box">
                <p className="so-box-text small">{noticeText}</p>
                <button
                  className={`so-btn main${hl(true)}`}
                  onClick={() => {
                    tap();
                    setNoticeText('');
                  }}
                >
                  확인
                </button>
              </Modal>
            )}
            {toast && <div className="scr-toast">{toast}</div>}
          </div>
          <div className="so-reader" data-tour="card">
            <span className="so-reader-ic">IC</span>
            <CardSlot st={card.st} onClick={card.clickCard} highlight={on} dir="up" label="" className="so-card" />
            <span className={`so-reader-led${card.st === 'processing' ? ' busy' : ''}`} />
          </div>
        </div>
        <div className="so-pole" />
        <div className="so-foot" />
      </div>
    </Scaler>
  );
}
