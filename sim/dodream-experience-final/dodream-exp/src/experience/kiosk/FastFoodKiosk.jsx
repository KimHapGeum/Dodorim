import { useEffect, useRef, useState } from 'react';
import Scaler from '../shared/Scaler';
import Modal from '../shared/Modal';
import Keypad from '../shared/Keypad';
import CardSlot from '../shared/CardSlot';
import FoodPic from '../shared/FoodPic';
import { useCardPay } from '../shared/useCardPay';
import { useGuide, useExp } from '../guide/GuideContext';
import { won, tap, beep } from '../shared/utils';

/*
 * 패스트푸드 키오스크 체험 (가상의 '두드림 버거')
 * 실제 패스트푸드점 키오스크의 진행 순서를 참고했고, 상호·로고·메뉴 이름·포인트/페이 이름은 쓰지 않았어요.
 * 순서: 터치 → 결제수단 → 메뉴(2열, 이전/다음) → 세트 사이드·음료 고르기 → 결제하기
 *       → Step1 포장/매장 → 얼음 옵션 → Step2 할인/적립 → Step3 결제 → 카드 넣기 → 주문번호
 */

const won0 = (n) => n.toLocaleString('ko-KR');

/* ───────── 메뉴 ───────── */
const CATS = [
  { id: 'rec', name: '추천메뉴' },
  { id: 'set', name: '실속세트' },
  { id: 'burger', name: '버거' },
  { id: 'side', name: '디저트·치킨' },
  { id: 'drink', name: '음료·커피' },
  { id: 'ice', name: '아이스크림' },
];

const ITEMS = [
  { id: 'x1', cat: 'set', name: '통새우버거 세트', price: 7200, emoji: '🍤', bg: '#f6d0bf', isNew: true, rec: true, desc: '탱글탱글한 새우살이 통째로 들어간 버거와 감자튀김, 음료' },
  { id: 'x2', cat: 'set', name: '불고기버거 세트', price: 6900, emoji: '🍔', bg: '#f3d9b5', rec: true, desc: '달콤짭짤한 불고기 소스에 아삭한 양상추를 넣은 기본 버거 세트' },
  { id: 'x3', cat: 'set', name: '매콤불고기버거 세트', price: 7100, emoji: '🍔', bg: '#f4c4b8', hot: true, rec: true, desc: '불고기에 청양고추 소스를 더해 매콤하게 즐기는 세트' },
  { id: 'x4', cat: 'set', name: '치즈버거 세트', price: 6500, emoji: '🧀', bg: '#f7e2a8', desc: '고소한 치즈를 두 장 올린 버거 세트' },
  { id: 'x5', cat: 'set', name: '모짜렐라버거 세트', price: 7500, emoji: '🍔', bg: '#f6e3c3', rec: true, desc: '쭉 늘어나는 모짜렐라 치즈 패티가 들어간 버거 세트' },
  { id: 'x6', cat: 'set', name: '더블패티버거 세트', price: 8200, emoji: '🍔', bg: '#e9cdb4', desc: '두툼한 고기 패티를 두 장 넣은 든든한 세트' },
  { id: 'x7', cat: 'set', name: '치킨버거 세트', price: 6300, emoji: '🍗', bg: '#f2dcb8', rec: true, desc: '바삭한 닭가슴살 패티 버거 세트' },
  { id: 'x8', cat: 'set', name: '매콤치킨버거 세트', price: 6600, emoji: '🍗', bg: '#f1c7b0', hot: true, desc: '매콤한 양념 치킨 패티 버거 세트' },
  { id: 'x9', cat: 'set', name: '한우불고기버거 세트', price: 10900, emoji: '🥩', bg: '#ecd2c5', isNew: true, desc: '국내산 한우로 만든 불고기 패티 세트' },
  { id: 'x10', cat: 'set', name: '클래식버거 세트', price: 5900, emoji: '🍔', bg: '#efe0c8', desc: '토마토와 양상추를 넣은 담백한 버거 세트' },
  { id: 'b1', cat: 'burger', name: '통새우버거', price: 5200, emoji: '🍤', bg: '#f6d0bf', isNew: true },
  { id: 'b2', cat: 'burger', name: '불고기버거', price: 4900, emoji: '🍔', bg: '#f3d9b5' },
  { id: 'b3', cat: 'burger', name: '매콤불고기버거', price: 5100, emoji: '🍔', bg: '#f4c4b8', hot: true },
  { id: 'b4', cat: 'burger', name: '치즈버거', price: 4500, emoji: '🧀', bg: '#f7e2a8' },
  { id: 'b5', cat: 'burger', name: '모짜렐라버거', price: 5500, emoji: '🍔', bg: '#f6e3c3' },
  { id: 'b6', cat: 'burger', name: '더블패티버거', price: 6200, emoji: '🍔', bg: '#e9cdb4' },
  { id: 'b7', cat: 'burger', name: '치킨버거', price: 4300, emoji: '🍗', bg: '#f2dcb8' },
  { id: 'b8', cat: 'burger', name: '클래식버거', price: 3900, emoji: '🍔', bg: '#efe0c8' },
  { id: 's1', cat: 'side', name: '감자튀김', price: 2000, emoji: '🍟', bg: '#f8e6a6', rec: true },
  { id: 's2', cat: 'side', name: '치즈스틱', price: 2300, emoji: '🧀', bg: '#f9e9b4' },
  { id: 's3', cat: 'side', name: '양념감자', price: 2500, emoji: '🍟', bg: '#f6d7a0', hot: true },
  { id: 's4', cat: 'side', name: '어니언링', price: 2500, emoji: '🧅', bg: '#f3dfb2' },
  { id: 's5', cat: 'side', name: '치킨너겟 (6조각)', price: 3500, emoji: '🍗', bg: '#f6e3c3' },
  { id: 's6', cat: 'side', name: '후라이드치킨 (2조각)', price: 5400, emoji: '🍗', bg: '#f2dcb8', rec: true },
  { id: 's7', cat: 'side', name: '매콤치킨 (2조각)', price: 5700, emoji: '🍗', bg: '#f1c7b0', hot: true },
  { id: 's8', cat: 'side', name: '콘샐러드', price: 2000, emoji: '🌽', bg: '#e6efc0' },
  { id: 'd1', cat: 'drink', name: '콜라', price: 2000, emoji: '🥤', bg: '#d9e6f5', cold: true },
  { id: 'd2', cat: 'drink', name: '사이다', price: 2000, emoji: '🥤', bg: '#d8f0e3', cold: true },
  { id: 'd3', cat: 'drink', name: '제로콜라', price: 2000, emoji: '🥤', bg: '#e1e1e1', cold: true },
  { id: 'd4', cat: 'drink', name: '아메리카노', price: 2500, emoji: '☕', bg: '#e8dccf', rec: true },
  { id: 'd5', cat: 'drink', name: '아이스티', price: 2500, emoji: '🧋', bg: '#f1dcc4', cold: true },
  { id: 'd6', cat: 'drink', name: '레몬에이드', price: 3200, emoji: '🍋', bg: '#f8f0b0', cold: true },
  { id: 'd7', cat: 'drink', name: '오렌지주스', price: 2800, emoji: '🧃', bg: '#fbe0bd', cold: true },
  { id: 'd8', cat: 'drink', name: '우유', price: 1800, emoji: '🥛', bg: '#eef1f5' },
  { id: 'i1', cat: 'ice', name: '소프트콘', price: 1000, emoji: '🍦', bg: '#f3e6ef', rec: true },
  { id: 'i2', cat: 'ice', name: '초코선데', price: 2300, emoji: '🍨', bg: '#ead8cc' },
  { id: 'i3', cat: 'ice', name: '딸기선데', price: 2300, emoji: '🍨', bg: '#f6d6dc' },
  { id: 'i4', cat: 'ice', name: '바닐라쉐이크', price: 2900, emoji: '🥤', bg: '#f4efe2', cold: true },
];

/* 세트 고르기 */
const SET_SIDES = [
  { id: 'ss1', name: '감자튀김', add: 0, emoji: '🍟', bg: '#f8e6a6', photo: 'kiosk-s1' },
  { id: 'ss2', name: '치즈스틱', add: 500, emoji: '🧀', bg: '#f9e9b4', photo: 'kiosk-s2' },
  { id: 'ss3', name: '양념감자', add: 500, emoji: '🍟', bg: '#f6d7a0', photo: 'kiosk-s3' },
  { id: 'ss4', name: '감자튀김(L)', add: 400, emoji: '🍟', bg: '#f8e6a6', photo: 'kiosk-s1' },
  { id: 'ss5', name: '어니언링', add: 500, emoji: '🧅', bg: '#f3dfb2', photo: 'kiosk-s4' },
  { id: 'ss6', name: '웨지감자', add: 300, emoji: '🥔', bg: '#efd9b0', photo: 'kiosk-wedge' },
  { id: 'ss7', name: '치즈볼', add: 500, emoji: '🧀', bg: '#f7e2a8', photo: 'kiosk-cheeseball' },
  { id: 'ss8', name: '콘샐러드', add: 500, emoji: '🌽', bg: '#e6efc0', photo: 'kiosk-s8' },
];
const SET_DRINKS = [
  { id: 'sd1', name: '콜라', add: 0, emoji: '🥤', bg: '#d9e6f5', photo: 'kiosk-d1', cold: true },
  { id: 'sd2', name: '사이다', add: 0, emoji: '🥤', bg: '#d8f0e3', photo: 'kiosk-d2', cold: true },
  { id: 'sd3', name: '제로콜라', add: 0, emoji: '🥤', bg: '#e1e1e1', photo: 'kiosk-d3', cold: true },
  { id: 'sd4', name: '콜라(L)', add: 200, emoji: '🥤', bg: '#d9e6f5', photo: 'kiosk-d1', cold: true },
  { id: 'sd5', name: '사이다(L)', add: 200, emoji: '🥤', bg: '#d8f0e3', photo: 'kiosk-d2', cold: true },
  { id: 'sd6', name: '아메리카노', add: 300, emoji: '☕', bg: '#e8dccf', photo: 'kiosk-d4' },
  { id: 'sd7', name: '아이스티', add: 400, emoji: '🧋', bg: '#f1dcc4', photo: 'kiosk-d5', cold: true },
  { id: 'sd8', name: '레몬에이드', add: 800, emoji: '🍋', bg: '#f8f0b0', photo: 'kiosk-d6', cold: true },
];

const PER_PAGE = 8;

/* ───────── (연습하기용) 미션 ───────── */
export const MISSION = {
  title: '햄버거 가게에서 세트 메뉴 포장 주문하기',
  steps: ['카드 결제 선택', '불고기버거 세트 1개 (감자튀김 · 콜라)', '포장 선택, 할인 없음', '카드로 결제'],
  checks: [
    {
      label: '불고기버거 세트 1개 (감자튀김 · 콜라)',
      test: (r) => r.items.some((i) => i.name === '불고기버거 세트' && i.subs.join(',') === '감자튀김,콜라' && i.qty === 1),
    },
    { label: '포장 선택', test: (r) => r.pack === '포장' },
    { label: '카드로 결제', test: (r) => r.method === 'card' },
  ],
};

/* ───────── 알아보기 순서 ───────── */
export const TOUR = [
  { sel: 'screen', title: '터치 화면', text: '손가락으로 화면을 살짝 눌러서 주문해요. 세게 누르지 않아도 돼요.' },
  { sel: 'feature', title: '메뉴 소개', text: '위쪽 큰 그림은 메뉴 소개예요. 방금 누른 메뉴나 오늘의 추천 메뉴가 나와요.' },
  { sel: 'cats', title: '메뉴 종류', text: '추천메뉴, 버거, 음료 같은 메뉴 종류예요. 양옆 ‹ › 를 누르면 다른 종류가 더 나와요.' },
  { sel: 'items', title: '메뉴 사진', text: '메뉴 사진을 누르면 주문할 수 있어요. 가격 뒤의 "~"는 고르는 것에 따라 돈이 더 붙을 수 있다는 뜻이에요.' },
  { sel: 'pager', title: '이전 · 다음', text: '화면 양옆의 "이전", "다음"을 누르면 메뉴가 다음 장으로 넘어가요. 가운데 점은 몇 번째 장인지 알려줘요.' },
  { sel: 'orders', title: '총주문내역', text: '고른 메뉴가 여기에 쌓여요. 개수를 바꾸거나 지울 수 있어요.' },
  { sel: 'paybtn', title: '결제하기', text: '다 고르셨으면 이 버튼을 눌러 돈을 내러 가요. "취소하기"는 고른 것을 모두 지워요.' },
  { sel: 'access', title: '도움 버튼', text: '휠체어 사용자용 화면, 글씨 크게 보기, 직원 부르기, 이전 화면으로 가기 버튼이에요.' },
  { sel: 'scanner', title: '바코드 리더', text: '휴대폰 쿠폰이나 간편결제 바코드를 비추는 곳이에요.' },
  { sel: 'card', title: '카드 단말기', text: '결제할 때 카드를 꽂는 곳이에요. IC칩(금색 네모)이 있는 쪽이 먼저 들어가요.' },
  { sel: 'printer', title: '영수증 나오는 곳', text: '결제가 끝나면 주문번호가 적힌 영수증이 여기로 나와요. 꼭 챙겨 가세요.' },
];

export default function FastFoodKiosk() {
  const { demo, finish } = useExp();
  const [screen, setScreen] = useState(demo ? 'menu' : 'idle'); // idle | paymethod | menu | pay | done
  const [cat, setCat] = useState('rec');
  const [page, setPage] = useState(0);
  const [tabStart, setTabStart] = useState(0);
  const [featured, setFeatured] = useState(ITEMS[1]);
  const [cart, setCart] = useState([]);
  const [setPop, setSetPop] = useState(null); // { item, tab, side, drink, editKey }
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(1);
  const [pack, setPack] = useState('');
  const [discount, setDiscount] = useState('');
  const [optPop, setOptPop] = useState(false);
  const [pointPop, setPointPop] = useState(false);
  const [phone, setPhone] = useState('');
  const [payPop, setPayPop] = useState(''); // card | mobile
  const [qrSt, setQrSt] = useState('idle');
  const [paid, setPaid] = useState(null); // { method, amount }
  const [receiptOut, setReceiptOut] = useState(null);
  const [orderNo, setOrderNo] = useState(0);
  const orderListRef = useRef(null);
  const timers = useRef([]);
  const pendingResult = useRef(null);

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  const completePay = (method) => {
    const no = 100 + Math.floor(Math.random() * 900);
    setPaid({ method, amount: total });
    setOrderNo(no);
    setPayPop('');
    beep(700, 0.6, 0.05);
    setReceiptOut({ no, total });
    setScreen('done');
    // 결과 창은 영수증을 챙기거나 '처음으로'를 누른 뒤에 보여줘요
    pendingResult.current = {
      items: cart.map((c) => ({ name: c.name, subs: c.subs.map((s) => s.name), qty: c.qty })),
      pack,
      method,
    };
  };
  const reportDone = () => {
    if (pendingResult.current) {
      finish(pendingResult.current);
      pendingResult.current = null;
    }
  };
  const card = useCardPay(() => completePay('card'));

  const go = (s) => {
    tap();
    setScreen(s);
  };
  const say = (text) => {
    tap();
    setNotice(text);
  };

  const resetAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setScreen('idle');
    setCat('rec');
    setPage(0);
    setTabStart(0);
    setFeatured(ITEMS[1]);
    setCart([]);
    setSetPop(null);
    setNotice('');
    setStep(1);
    setPack('');
    setDiscount('');
    setOptPop(false);
    setPointPop(false);
    setPhone('');
    setPayPop('');
    setQrSt('idle');
    setPaid(null);
    card.reset();
  };

  /* 메뉴 목록 · 넘기기 */
  const itemsOf = (c) => (c === 'rec' ? ITEMS.filter((i) => i.rec) : ITEMS.filter((i) => i.cat === c));
  const list = itemsOf(cat);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const visible = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const catIdx = CATS.findIndex((c) => c.id === cat);

  const chooseCat = (id) => {
    tap();
    setCat(id);
    setPage(0);
    const i = CATS.findIndex((c) => c.id === id);
    if (i < tabStart) setTabStart(i);
    if (i > tabStart + 3) setTabStart(i - 3);
  };
  const nextPage = () => {
    if (page < pages - 1) {
      tap();
      setPage(page + 1);
    } else if (catIdx < CATS.length - 1) chooseCat(CATS[catIdx + 1].id);
  };
  const prevPage = () => {
    if (page > 0) {
      tap();
      setPage(page - 1);
    } else if (catIdx > 0) {
      const prev = CATS[catIdx - 1].id;
      chooseCat(prev);
      setPage(Math.max(0, Math.ceil(itemsOf(prev).length / PER_PAGE) - 1));
    }
  };

  /* 장바구니 */
  const addLine = (line, replaceKey) => {
    setCart((cs) => {
      let next = replaceKey ? cs.filter((c) => c.key !== replaceKey) : cs;
      const f = next.find((c) => c.key === line.key);
      if (f) next = next.map((c) => (c.key === line.key ? { ...c, qty: c.qty + line.qty } : c));
      else next = [...next, line];
      return next;
    });
    beep(1000, 0.08, 0.08);
    setToast('총주문내역에 담았어요');
    later(() => {
      const el = orderListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  };

  const pick = (it) => {
    tap();
    setFeatured(it);
    if (it.cat === 'set') {
      setSetPop({ item: it, tab: 'side', side: null, drink: null });
      return;
    }
    addLine({
      key: it.id,
      id: it.id,
      name: it.name,
      price: it.price,
      qty: 1,
      emoji: it.emoji,
      bg: it.bg,
      subs: [],
      cold: !!it.cold,
      ice: true,
    });
  };

  const finishSet = () => {
    const { item, side, drink, editKey, qty } = setPop;
    addLine(
      {
        key: `${item.id}|${side.id}|${drink.id}`,
        id: item.id,
        name: item.name,
        price: item.price + side.add + drink.add,
        qty: qty || 1,
        emoji: item.emoji,
        bg: item.bg,
        subs: [
          { name: side.name, add: side.add },
          { name: drink.name, add: drink.add },
        ],
        cold: !!drink.cold,
        drinkName: drink.name,
        ice: true,
      },
      editKey
    );
    setSetPop(null);
  };

  const changeQty = (key, d) => {
    tap();
    setCart((cs) => cs.map((c) => (c.key === key ? { ...c, qty: Math.max(1, c.qty + d) } : c)));
  };
  const removeLine = (key) => {
    tap();
    setCart((cs) => cs.filter((c) => c.key !== key));
  };
  const editSet = (c) => {
    tap();
    const item = ITEMS.find((i) => i.id === c.id);
    const side = SET_SIDES.find((s) => s.name === c.subs[0].name);
    const drink = SET_DRINKS.find((s) => s.name === c.subs[1].name);
    setSetPop({ item, tab: 'side', side, drink, editKey: c.key, qty: c.qty });
  };

  /* 결제 단계 */
  const startPay = () => {
    tap();
    setStep(1);
    setPack('');
    setDiscount('');
    setScreen('pay');
  };
  const choosePack = (p) => {
    tap();
    setPack(p);
    if (cart.some((c) => c.cold)) setOptPop(true);
    else setStep(2);
  };
  const chooseDiscount = (d) => {
    if (d === 'partner') {
      say('통신사 · 제휴 카드 할인은 직원에게 문의해 주세요. 이번 체험에서는 "선택 없음"을 눌러 볼게요.');
      return;
    }
    if (d === 'point') {
      tap();
      setPhone('');
      setPointPop(true);
      return;
    }
    tap();
    setDiscount('none');
    setStep(3);
  };
  const chooseMethod = (m) => {
    if (m === 'card') {
      tap();
      setPayPop('card');
      card.start();
    } else if (m === 'mobile') {
      tap();
      setPayPop('mobile');
      setQrSt('ready');
    } else if (m === 'dpay') {
      say('두드림페이는 두드림 앱에 미리 카드를 등록해 두고 쓰는 결제예요. 이번 체험에서는 "신용/체크 카드"로 해 볼게요.');
    } else {
      say('교통카드는 카드 단말기 위에 카드를 올려 두면 결제돼요. 이번 체험에서는 "신용/체크 카드"로 해 볼게요.');
    }
  };
  const cancelPayPop = () => {
    tap();
    card.reset();
    setPayPop('');
    setQrSt('idle');
  };
  const clickPhone = () => {
    if (qrSt !== 'ready') return;
    tap();
    setQrSt('processing');
    later(() => {
      beep(1500, 0.2);
      setQrSt('idle');
      completePay('mobile');
    }, 1800);
  };

  /* ───────── 도우미 안내 ───────── */
  let guide = '';
  if (notice) guide = '안내창이에요. 내용을 읽고 "확인"을 눌러 주세요.';
  else if (setPop)
    guide =
      setPop.tab === 'side'
        ? '세트에 같이 나올 사이드를 하나 고르세요. 이름 아래 숫자는 더 내는 돈이에요(0은 추가금 없음). 보통은 "감자튀김"을 골라요.'
        : setPop.drink
          ? '사이드와 음료를 다 골랐어요. 아래 "선택완료"를 눌러 주세요.'
          : '같이 마실 음료를 하나 고르세요. 0원인 콜라, 사이다는 추가금이 없어요.';
  else if (optPop) guide = '음료에 얼음을 넣을지 고르는 창이에요. 얼음을 빼려면 ✓ 표시를 눌러 지우세요. 다 되면 "선택완료"를 누르세요.';
  else if (pointPop)
    guide =
      phone.length >= 10
        ? '번호를 다 누르셨어요. "적립하기"를 눌러 주세요.'
        : '포인트를 쌓을 휴대폰 번호를 누르세요. 체험이니 아무 번호나 괜찮아요.';
  else if (payPop === 'card')
    guide = {
      ready: '화면 그림처럼 카드를 넣어요. 화면 아래 오른쪽 "카드 단말기"에서 반짝이는 카드를 눌러 꽂아 보세요.',
      processing: '결제 중이에요. 카드를 빼지 말고 잠시만 기다려 주세요.',
      remove: '결제가 끝났어요! 카드를 눌러서 빼 주세요.',
      done: '',
      idle: '',
    }[card.st];
  else if (payPop === 'mobile')
    guide =
      qrSt === 'processing'
        ? '바코드를 읽고 있어요. 잠시만 기다려 주세요.'
        : '휴대폰 결제 앱의 바코드를 화면 아래 "바코드 리더"에 비추는 방법이에요. 반짝이는 휴대폰을 눌러 보세요.';
  else
    guide = {
      idle: '패스트푸드 가게의 주문 기계예요. 화면 아무 곳이나 눌러서 시작해 보세요.',
      paymethod: '먼저 돈을 낼 방법을 골라요. 이 가게는 현금을 받지 않아요. 위쪽 큰 "카드" 버튼을 눌러 주세요.',
      menu:
        cart.length === 0
          ? '위쪽 메뉴 종류를 누르거나 양옆 "이전 · 다음"으로 메뉴를 넘겨 보세요. 먹고 싶은 메뉴를 누르면 돼요. 처음이면 "불고기버거 세트"를 눌러 볼까요?'
          : '아래 "총주문내역"에 고른 메뉴가 담겼어요. 더 고르셔도 되고, 다 고르셨으면 오른쪽 아래 "결제하기"를 눌러 주세요.',
      pay: {
        1: '오른쪽 노란 말풍선을 보세요. Step 1이에요. 싸 가실 거면 "포장", 가게에서 드실 거면 "매장"을 누르세요.',
        2: 'Step 2는 할인과 포인트예요. 해당 없으면 "선택 없음"을 누르세요.',
        3: 'Step 3, 마지막이에요! 카드로 내려면 "신용/체크 카드"를 누르세요.',
      }[step],
      done: `주문 끝! 주문번호는 ${orderNo}번이에요. 화면 아래로 나온 영수증에 주문번호가 적혀 있으니 눌러서 꼭 챙기세요.`,
    }[screen];
  const on = useGuide(guide || '');
  const hl = (cond) => (on && cond ? ' hl' : '');

  /* ───────── 공통 조각 ───────── */
  const langBar = (
    <div className="lt-lang" data-tour="lang">
      <b>한국어</b>
      <span>English</span>
      <span>中国語</span>
      <span>日本語</span>
    </div>
  );
  const accessBar = (
    <div className="lt-access" data-tour="access">
      <button onClick={() => say('휠체어를 타신 분을 위해 버튼을 화면 아래쪽으로 모아 주는 버튼이에요.')}>
        <span>♿</span>장애인
      </button>
      <button onClick={() => say('글씨와 그림을 크게 보여주는 돋보기 버튼이에요.')}>
        <span>🔍</span>돋보기
      </button>
      <button onClick={() => say('직원을 호출했습니다. 잠시만 기다려 주세요.')}>
        <span>🔔</span>직원호출
      </button>
      <button
        onClick={() => {
          tap();
          if (screen === 'pay') setScreen('menu');
          else if (screen === 'menu') setScreen('paymethod');
          else if (screen === 'paymethod') setScreen('idle');
        }}
      >
        <span>◀</span>이전
      </button>
    </div>
  );
  const adBanner = (
    <div className="lt-ad">
      <div className="lt-ad-text">
        <small>탱글탱글 새우가 통째로 쏙!</small>
        <b>신메뉴 통새우버거</b>
        <span>
          세트 주문 시 음료 <em>사이즈업 무료</em>
        </span>
      </div>
      <FoodPic emoji="🍤" bg="transparent" size={70} className="lt-ad-pic" photo="kiosk-x1" />
    </div>
  );

  /* ───────── 화면 ───────── */
  const renderScreen = () => {
    switch (screen) {
      case 'idle':
        return (
          <button className="lt-idle" onClick={() => go('paymethod')}>
            <div className="lt-idle-top">
              <p className="lt-idle-sub">기다리지 않고 간편하게</p>
              <p className="lt-idle-title">
                여기에서
                <br />
                주문하세요!
              </p>
              <span className={`lt-idle-touch${hl(true)}`}>
                <span className="lt-idle-ring">👆</span>화면을 터치해 주세요
              </span>
            </div>
            <div className="lt-idle-box">
              <div className="lt-nocash">
                <span className="lt-nocash-icon" aria-hidden="true">
                  💵
                </span>
                <span>
                  저희 매장은
                  <br />
                  <b>현금 없는 매장</b>으로
                  <br />
                  운영 중입니다.
                </span>
              </div>
              <p className="lt-idle-quick">빠르고 편리하게 결제하세요!</p>
              <div className="lt-idle-means">
                <span className="lt-idle-means-title">결제 가능 수단</span>
                <span className="lt-idle-means-row">
                  <span>
                    💳<b>카드</b>
                  </span>
                  <span>
                    📱<b>휴대폰 결제</b>
                  </span>
                  <span>
                    🚌<b>교통카드</b>
                  </span>
                </span>
              </div>
            </div>
            <div className="lt-idle-foot">
              <span className="lt-idle-access">♿ 🔍 🔔</span>
              <span>한국어 &nbsp;English &nbsp;中国語 &nbsp;日本語</span>
            </div>
          </button>
        );

      case 'paymethod':
        return (
          <div className="lt-page">
            {langBar}
            {adBanner}
            <h2 className="lt-h2">원하시는 결제방법을 선택해 주세요</h2>
            <button className={`lt-pm-card${hl(true)}`} onClick={() => go('menu')}>
              <span className="lt-pm-cardpic" aria-hidden="true">
                <span className="lt-pm-stripe" />
                <span className="lt-pm-chip" />
              </span>
              <span className="lt-pm-cardtext">
                <b>카드</b>
                <small>
                  신용/체크카드
                  <br />
                  모바일 금액권
                  <br />
                  휴대폰 간편결제
                </small>
              </span>
            </button>
            <div className="lt-pm-row">
              <button
                className="lt-pm-sub"
                onClick={() => say('휴대폰 쿠폰은 메뉴를 고른 뒤 결제할 때 바코드를 스캐너에 비춰서 써요. 이번 체험에서는 "카드"로 해 볼게요.')}
              >
                <span className="lt-pm-subicon">🎟️</span>
                <b className="green">디지털쿠폰 / 교환권</b>
                <small>모바일 상품권 · 교환권</small>
              </button>
              <button className="lt-pm-sub off" onClick={() => say('이 매장은 현금 없는 매장이에요. 카드나 휴대폰 결제를 이용해 주세요.')}>
                <span className="lt-pm-subicon">🪙</span>
                <b className="blue">현금</b>
                <small>현금 없는 매장으로 다른 결제수단을 이용해 주세요</small>
              </button>
            </div>
            <div className="lt-bottom">
              {accessBar}
              <button className="lt-event" onClick={() => say('지금 진행 중인 할인 행사를 보여주는 버튼이에요.')}>
                🎁 할인행사안내
              </button>
            </div>
          </div>
        );

      case 'menu':
        return (
          <div className="lt-page">
            {langBar}
            <div className="lt-feature" data-tour="feature">
              <FoodPic emoji={featured.emoji} bg={featured.bg} size={58} className="lt-feature-pic" photo={`kiosk-${featured.id}`} />
              <div className="lt-feature-text">
                <b>
                  {featured.name}
                  <button className="lt-nutri" onClick={() => say('메뉴의 열량, 나트륨 같은 영양 정보를 보여주는 버튼이에요.')}>
                    영양성분
                  </button>
                </b>
                <span>{featured.desc || `두드림 버거의 ${featured.name}입니다.`}</span>
              </div>
            </div>
            <div className="lt-tabs" data-tour="cats">
              <button
                className="lt-tab-arrow"
                onClick={() => {
                  tap();
                  setTabStart((s) => Math.max(0, s - 1));
                }}
                aria-label="이전 메뉴 종류"
              >
                ‹
              </button>
              {CATS.slice(tabStart, tabStart + 4).map((c) => (
                <button key={c.id} className={`lt-tab${cat === c.id ? ' on' : ''}`} onClick={() => chooseCat(c.id)}>
                  {c.name}
                </button>
              ))}
              <button
                className="lt-tab-arrow"
                onClick={() => {
                  tap();
                  setTabStart((s) => Math.min(CATS.length - 4, s + 1));
                }}
                aria-label="다음 메뉴 종류"
              >
                ›
              </button>
            </div>
            <div className="lt-gridwrap">
              <button className="lt-side prev" onClick={prevPage} data-tour="pager">
                이<br />전
              </button>
              <div className="lt-grid" data-tour="items">
                {visible.map((it) => (
                  <button
                    key={it.id}
                    className={`lt-item${hl(cart.length === 0 && !setPop && it.id === 'x2')}`}
                    onClick={() => pick(it)}
                  >
                    <span className="lt-item-pic">
                      <FoodPic emoji={it.emoji} bg={it.bg} size={40} photo={`kiosk-${it.id}`} />
                      {it.isNew && <span className="lt-new">NEW</span>}
                    </span>
                    <span className="lt-item-text">
                      <span className="lt-item-name">
                        {it.name}
                        {it.hot && <span className="lt-hot">🌶</span>}
                      </span>
                      <span className="lt-item-price">
                        {won0(it.price)}
                        {it.cat === 'set' ? ' ~' : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <button className="lt-side next" onClick={nextPage}>
                다<br />음
              </button>
            </div>
            <div className="lt-dots">
              {Array.from({ length: pages }).map((_, i) => (
                <span key={i} className={i === page ? 'on' : ''} />
              ))}
            </div>
            <div className="lt-sumbar">
              <span>총주문내역</span>
              <b>
                {count} <small>개</small>
              </b>
              <strong>{total ? won0(total) : ''}</strong>
            </div>
            <div className="lt-orders" data-tour="orders">
              <div className="lt-orderlist" ref={orderListRef}>
                {cart.length === 0 && <div className="lt-empty">메뉴를 선택해 주세요</div>}
                {cart.map((c) => (
                  <div key={c.key} className="lt-orow">
                    <span className="lt-oname">
                      {c.name}
                      {c.subs.length > 0 && <small>({c.subs.map((s) => s.name).join(', ')})</small>}
                    </span>
                    <span className="lt-oqty">
                      <b>{c.qty}</b>
                      <span className="lt-spin">
                        <button onClick={() => changeQty(c.key, 1)} aria-label="하나 더하기">
                          ▲
                        </button>
                        <button onClick={() => changeQty(c.key, -1)} aria-label="하나 빼기">
                          ▼
                        </button>
                      </span>
                    </span>
                    <span className="lt-oprice">{won0(c.price * c.qty)}</span>
                    {c.subs.length > 0 ? (
                      <button className="lt-obtn" onClick={() => editSet(c)}>
                        변경
                      </button>
                    ) : (
                      <span className="lt-obtn-ph" />
                    )}
                    <button className="lt-obtn" onClick={() => removeLine(c.key)}>
                      삭제
                    </button>
                  </div>
                ))}
              </div>
              <div className="lt-scroll">
                <button
                  onClick={() => {
                    if (orderListRef.current) orderListRef.current.scrollBy({ top: -44, behavior: 'smooth' });
                  }}
                  aria-label="위로"
                >
                  ˄
                </button>
                <button
                  onClick={() => {
                    if (orderListRef.current) orderListRef.current.scrollBy({ top: 44, behavior: 'smooth' });
                  }}
                  aria-label="아래로"
                >
                  ˅
                </button>
              </div>
            </div>
            <div className="lt-bottom">
              {accessBar}
              <button
                className="lt-cancel"
                onClick={() => {
                  tap();
                  setCart([]);
                }}
              >
                취소하기
              </button>
              <button className={`lt-paybtn${hl(cart.length > 0)}`} disabled={!cart.length} onClick={startPay} data-tour="paybtn">
                결제하기
              </button>
            </div>
          </div>
        );

      case 'pay': {
        const rows = [];
        cart.forEach((c) => {
          rows.push({ key: c.key, name: c.name, qty: c.qty, price: c.price * c.qty - c.subs.reduce((s, x) => s + x.add * c.qty, 0) });
          c.subs.forEach((s) =>
            rows.push({
              key: `${c.key}-${s.name}`,
              name: `-${s.name}${!c.ice && s.name === c.drinkName ? ' (얼음X)' : ''}`,
              qty: c.qty,
              price: s.add * c.qty,
              sub: true,
            })
          );
          if (!c.subs.length && c.cold && !c.ice) rows.push({ key: `${c.key}-ice`, name: '-얼음 빼기', qty: c.qty, price: 0, sub: true });
        });
        const stepCls = (n) => `lt-step${step === n ? ' on' : step > n ? ' done' : ' off'}`;
        const tileOn = (n) => step === n && !optPop && !pointPop && !payPop;
        return (
          <div className="lt-page">
            {langBar}
            {adBanner}
            <div className="lt-paybody">
              <div className="lt-bill">
                <div className="lt-bill-head">
                  <span>제품</span>
                  <span>수량</span>
                  <span>금액</span>
                </div>
                <div className="lt-bill-list">
                  {rows.map((r) => (
                    <div key={r.key} className={`lt-bill-row${r.sub ? ' sub' : ''}`}>
                      <span>{r.name}</span>
                      <span>{r.qty}</span>
                      <span>{won0(r.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="lt-bill-pager">
                  <span>이전</span>
                  <i />
                  <span>다음</span>
                </div>
                <div className="lt-bill-sum">
                  <span>주문금액</span>
                  <b>{won0(total)}</b>
                </div>
                <div className="lt-bill-sum">
                  <span>할인금액</span>
                  <b>0</b>
                </div>
                <div className="lt-bill-due">
                  <span>결제할금액</span>
                  <b>{won0(paid ? 0 : total)}</b>
                </div>
                <div className="lt-bill-sum">
                  <span>결제한금액</span>
                  <b>{won0(paid ? paid.amount : 0)}</b>
                </div>
                <div className="lt-bill-kind">
                  <div>
                    <span>결제종류</span>
                    <span>금액</span>
                  </div>
                </div>
              </div>

              <div className="lt-steps">
                <div className={stepCls(1)}>
                  <div className="lt-step-head">Step 1 포장을 선택하세요.</div>
                  <div className="lt-step-tiles two">
                    {[
                      ['포장', '📦', '1회용기 제공'],
                      ['매장', '🏪', '다회용기 제공'],
                    ].map(([k, ic, sub]) => (
                      <button key={k} className={`lt-tile${pack === k ? ' picked' : ''}${hl(tileOn(1))}`} disabled={step !== 1} onClick={() => choosePack(k)}>
                        <span className="lt-tile-icon">{ic}</span>
                        <b>{k}</b>
                        <small>({sub})</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={stepCls(2)}>
                  <div className="lt-step-head">Step 2 할인/적립을 선택하세요.</div>
                  <div className="lt-step-tiles three">
                    <button className="lt-tile" disabled={step !== 2} onClick={() => chooseDiscount('partner')}>
                      <span className="lt-tile-icon">🏷️</span>
                      <b>제휴사 할인</b>
                    </button>
                    <button className={`lt-tile${discount === 'point' ? ' picked' : ''}`} disabled={step !== 2} onClick={() => chooseDiscount('point')}>
                      <span className="lt-tile-icon">Ⓟ</span>
                      <b>
                        두드림포인트
                        <br />
                        적립/사용
                      </b>
                    </button>
                    <button className={`lt-tile${discount === 'none' ? ' picked' : ''}${hl(tileOn(2))}`} disabled={step !== 2} onClick={() => chooseDiscount('none')}>
                      <span className="lt-tile-icon big">✕</span>
                      <b>선택 없음</b>
                    </button>
                  </div>
                </div>
                <div className={stepCls(3)}>
                  <div className="lt-step-head">Step 3 결제를 선택하세요</div>
                  <div className="lt-step-tiles three">
                    <button className={`lt-tile${hl(tileOn(3))}`} disabled={step !== 3} onClick={() => chooseMethod('card')}>
                      <span className="lt-tile-icon">💳</span>
                      <b>신용/체크 카드</b>
                    </button>
                    <button className="lt-tile" disabled={step !== 3} onClick={() => chooseMethod('mobile')}>
                      <span className="lt-tile-icon">📱</span>
                      <b>
                        모바일
                        <br />
                        /바코드/페이
                      </b>
                    </button>
                    <span className="lt-tile-stack">
                      <button className="lt-tile half" disabled={step !== 3} onClick={() => chooseMethod('dpay')}>
                        <b className="lt-dpay">D.PAY</b>
                      </button>
                      <button className="lt-tile half" disabled={step !== 3} onClick={() => chooseMethod('transit')}>
                        <span className="lt-tile-icon sm">🚌</span>
                        <small>교통카드</small>
                      </button>
                    </span>
                  </div>
                </div>
                {!optPop && !pointPop && !payPop && (
                  <div className={`lt-bubble s${step}`}>
                    <b>Step {step}</b>
                    {step === 1 && (
                      <>
                        포장여부를
                        <br />
                        선택해 주세요
                      </>
                    )}
                    {step === 2 && (
                      <>
                        할인/적립을
                        <br />
                        선택해 주세요
                      </>
                    )}
                    {step === 3 && (
                      <>
                        결제수단을
                        <br />
                        선택해 주세요
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="lt-bottom">
              {accessBar}
              <button
                className="lt-cancel"
                onClick={() => {
                  tap();
                  setScreen('menu');
                }}
              >
                결제취소
              </button>
              <button
                className="lt-paybtn light"
                onClick={() => {
                  tap();
                  setScreen('menu');
                }}
              >
                추가주문
              </button>
            </div>
          </div>
        );
      }

      case 'done':
        return (
          <div className="lt-page lt-done">
            {langBar}
            {adBanner}
            <div className="lt-done-body">
              <div className="ok-circle">✓</div>
              <h2 className="lt-h2">결제가 완료되었습니다</h2>
              <p className="lt-done-label">주문번호</p>
              <div className="lt-orderno">{orderNo}</div>
              <p className="lt-done-sub">
                주문번호가 적힌 영수증을 꼭 가져가세요.
                <br />
                음식이 준비되면 화면과 방송으로 번호를 불러 드려요.
              </p>
              {receiptOut && <div className="arrow-down">▼ 아래로 나온 영수증을 챙기세요 ▼</div>}
              <button
                className={`lt-paybtn wide${hl(!receiptOut)}`}
                onClick={() => {
                  tap();
                  reportDone();
                  resetAll();
                }}
              >
                처음으로
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  /* ───────── 팝업 ───────── */
  const renderPopups = () => {
    if (setPop) {
      const isSide = setPop.tab === 'side';
      const opts = isSide ? SET_SIDES : SET_DRINKS;
      const chosen = isSide ? setPop.side : setPop.drink;
      const picked = (setPop.side ? 1 : 0) + (setPop.drink ? 1 : 0);
      return (
        <div className="lt-overlay">
          <div className="lt-setpop">
            <h3>{isSide ? '세트 사이드 1개를 선택해 주세요' : '세트 음료 1개를 선택해 주세요'}</h3>
            <div className="lt-settabs">
              <button
                className={isSide ? 'on' : ''}
                onClick={() => {
                  tap();
                  setSetPop({ ...setPop, tab: 'side' });
                }}
              >
                세트_사이드{setPop.side ? ' ✓' : ''}
              </button>
              <button
                className={!isSide ? 'on' : ''}
                onClick={() => {
                  tap();
                  setSetPop({ ...setPop, tab: 'drink' });
                }}
              >
                세트_음료{setPop.drink ? ' ✓' : ''}
              </button>
            </div>
            <div className="lt-setgrid">
              {opts.map((o) => (
                <button
                  key={o.id}
                  className={`lt-setopt${chosen && chosen.id === o.id ? ' on' : ''}${hl(
                    !chosen && o.id === (isSide ? 'ss1' : 'sd1')
                  )}`}
                  onClick={() => {
                    tap();
                    if (isSide) setSetPop({ ...setPop, side: o, tab: setPop.drink ? 'side' : 'drink' });
                    else setSetPop({ ...setPop, drink: o });
                  }}
                >
                  <FoodPic emoji={o.emoji} bg={o.bg} size={30} className="lt-setopt-pic" photo={o.photo} />
                  <span className="lt-setopt-name">{o.name}</span>
                  <span className="lt-setopt-add">{won0(o.add)}</span>
                </button>
              ))}
            </div>
            <div className="lt-setfoot">
              <span className="lt-setinfo">
                • 선택수량: {picked}
                <br />• 남은수량: {2 - picked}
              </span>
              <button
                className="lt-cancel"
                onClick={() => {
                  tap();
                  setSetPop(null);
                }}
              >
                취소하기
              </button>
              <button className={`lt-done-btn${hl(picked === 2)}`} disabled={picked < 2} onClick={finishSet}>
                선택완료
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (optPop) {
      const drinks = cart.filter((c) => c.cold);
      return (
        <div className="lt-overlay">
          <div className="lt-optpop">
            <h3>옵션을 선택해주세요</h3>
            <div className="lt-opt-head">
              <span>제품</span>
              <span>얼음</span>
            </div>
            <div className="lt-opt-list">
              {drinks.map((c) => (
                <button
                  key={c.key}
                  className="lt-opt-row"
                  onClick={() => {
                    tap();
                    setCart((cs) => cs.map((x) => (x.key === c.key ? { ...x, ice: !x.ice } : x)));
                  }}
                >
                  <span>{c.drinkName || c.name}</span>
                  <span className="lt-check">{c.ice ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            <div className="lt-setfoot">
              <span className="lt-spacer" />
              <button
                className="lt-cancel"
                onClick={() => {
                  tap();
                  setOptPop(false);
                  setPack('');
                }}
              >
                취소하기
              </button>
              <button
                className={`lt-done-btn${hl(true)}`}
                onClick={() => {
                  tap();
                  setOptPop(false);
                  setStep(2);
                }}
              >
                선택완료
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (pointPop) {
      return (
        <div className="lt-overlay">
          <div className="lt-optpop">
            <h3>두드림포인트 적립</h3>
            <p className="lt-pop-text">포인트를 쌓을 휴대폰 번호를 입력해 주세요.</p>
            <div className="lt-phone">
              {phone.replace(/^(\d{3})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join('-')) || '010-____-____'}
            </div>
            <Keypad
              className="lt-kp"
              highlight={on && phone.length < 10}
              onKey={(k) => setPhone((p) => (p + k).slice(0, 11))}
              onDelete={() => setPhone((p) => p.slice(0, -1))}
              onClear={() => setPhone('')}
            />
            <div className="lt-setfoot">
              <span className="lt-spacer" />
              <button
                className="lt-cancel"
                onClick={() => {
                  tap();
                  setPointPop(false);
                }}
              >
                취소하기
              </button>
              <button
                className={`lt-done-btn${hl(phone.length >= 10)}`}
                disabled={phone.length < 10}
                onClick={() => {
                  beep(1200, 0.12);
                  setPointPop(false);
                  setDiscount('point');
                  setStep(3);
                }}
              >
                적립하기
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (payPop === 'card') {
      return (
        <div className="lt-overlay">
          <div className="lt-cardpop">
            <h3>신용/체크카드</h3>
            <p>
              {card.st === 'ready' && (
                <>
                  *그림과 같이 카드를 넣어주세요
                  <br />
                  (IC칩이 단말기에 들어가도록 넣어주세요)
                </>
              )}
              {card.st === 'processing' && '결제 중입니다. 카드를 빼지 마세요.'}
              {card.st === 'remove' && '결제가 완료되었습니다. 카드를 빼 주세요.'}
            </p>
            <div className="lt-cardpop-pics" aria-hidden="true">
              <span className="lt-cp-card">
                <span className="lt-cp-chip" />
              </span>
              <span className="lt-cp-term">
                <span className="lt-cp-clip">
                  <span className="lt-cp-term-card" />
                </span>
                <span className="lt-cp-term-slot" />
                <span className="lt-cp-arrow">⬇</span>
              </span>
            </div>
            <div className="lt-cardpop-foot">
              <span className="lt-cardpop-wait">
                {card.st === 'processing' ? '[카드 리더기] 승인 요청 중' : card.st === 'remove' ? '[카드 리더기] 카드 제거 대기' : '[카드 리더기] 카드 삽입 대기'}
              </span>
              {card.st === 'ready' && (
                <button className="lt-cancel" onClick={cancelPayPop}>
                  취소
                </button>
              )}
            </div>
            {(card.st === 'ready' || card.st === 'remove') && <div className="arrow-down">▼ 화면 아래 오른쪽 카드 단말기 ▼</div>}
          </div>
        </div>
      );
    }
    if (payPop === 'mobile') {
      return (
        <div className="lt-overlay">
          <div className="lt-cardpop">
            <h3>모바일 / 바코드 / 페이</h3>
            <p>{qrSt === 'processing' ? '결제 중입니다.' : '휴대폰 결제 화면의 바코드를 아래 바코드 리더에 대 주세요.'}</p>
            {qrSt === 'processing' ? <div className="spinner" /> : <div className="lt-cardpop-big">📱</div>}
            <div className="lt-cardpop-foot">
              <span className="lt-cardpop-wait">[바코드 리더] 바코드 대기</span>
              {qrSt === 'ready' && (
                <button className="lt-cancel" onClick={cancelPayPop}>
                  취소
                </button>
              )}
            </div>
            {qrSt === 'ready' && <div className="arrow-down">▼ 화면 아래 바코드 리더 ▼</div>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Scaler width={560} height={1200}>
      <div className="kd">
        <div className="kd-glass">
          <span className="kd-cam" />
          <div className="scr kd-screen lt" data-tour="screen">
            {renderScreen()}
            {renderPopups()}
            {notice && (
              <Modal>
                <p className="lt-pop-text">{notice}</p>
                <button
                  className={`lt-done-btn wide${hl(true)}`}
                  onClick={() => {
                    tap();
                    setNotice('');
                  }}
                >
                  확인
                </button>
              </Modal>
            )}
            {toast && <div className="scr-toast">{toast}</div>}
          </div>
        </div>

        {/* 아래: 흰색 몸체 (영수증 프린터 / 바코드 리더 / 카드 단말기) */}
        <div className="kd-body">
          <div className="kd-brand">두드림 버거</div>
          <div className="kd-printer" data-tour="printer">
            <div className="kd-printer-face">
              <span className="kd-led" />
              <span className="kd-led green" />
            </div>
            <div className="kd-printer-out">
              {receiptOut && (
                <button
                  className={`v-receipt${hl(true)}`}
                  onClick={() => {
                    tap();
                    setReceiptOut(null);
                    if (screen === 'done') reportDone();
                  }}
                  aria-label="영수증 가져가기"
                >
                  <b>두드림 버거</b>
                  <span>주문번호</span>
                  <span className="big-no">{receiptOut.no}</span>
                  <span>합계 {won(receiptOut.total)}</span>
                </button>
              )}
            </div>
            <div className="kd-printer-slot" />
            <div className="hw-label dark">영수증</div>
          </div>
          <div className="kd-pay">
            <div className="kd-scanner" data-tour="scanner">
              <div className={`kd-scanner-win${qrSt === 'processing' ? ' scan' : ''}`}>
                {qrSt !== 'idle' && (
                  <button
                    className={`v-phone${qrSt === 'processing' ? ' on' : ''}${hl(qrSt === 'ready')}`}
                    onClick={clickPhone}
                    aria-label="휴대폰 바코드 대기"
                  >
                    <span className="v-phone-bar">||| || ||| |</span>
                  </button>
                )}
              </div>
              <div className="hw-label dark">바코드 리더</div>
            </div>
            <CardSlot st={card.st} onClick={card.clickCard} highlight={on} label="카드 단말기" className="kd-card" />
          </div>
        </div>
      </div>
    </Scaler>
  );
}
