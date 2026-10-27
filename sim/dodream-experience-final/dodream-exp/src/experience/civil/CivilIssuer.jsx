import { useEffect, useRef, useState } from 'react';
import Scaler from '../shared/Scaler';
import Keypad from '../shared/Keypad';
import CardSlot from '../shared/CardSlot';
import Modal from '../shared/Modal';
import { useCardPay, CARD_TEXT, CARD_GUIDE } from '../shared/useCardPay';
import { useGuide, useExp, speak, stopSpeak } from '../guide/GuideContext';
import { won, tap, beep } from '../shared/utils';

/* 첫 화면 증명서 분류 (실제 발급기 배치를 참고) */
const GROUPS = [
  '주민등록',
  '지적·토지·건축',
  '차량',
  '보건복지',
  '지방세',
  '어선원부',
  '가족관계등록부',
  '제적부',
  '병적증명서',
  '건강보험',
  '국세증명',
  '국민연금',
  '여권',
  '교육',
  '교통(경찰청)',
];

/* 분류별 서류 (수수료는 체험용 금액이에요) */
const DOCS = {
  주민등록: [
    { name: '주민등록표 등본', fee: 200, opts: 'deungbon' },
    { name: '주민등록표 초본', fee: 200, opts: 'chobon' },
  ],
  '지적·토지·건축': [
    { name: '토지(임야)대장', fee: 500 },
    { name: '건축물대장', fee: 500 },
    { name: '토지이용계획확인서', fee: 1000 },
  ],
  가족관계등록부: [
    { name: '가족관계증명서', fee: 500 },
    { name: '기본증명서', fee: 500 },
    { name: '혼인관계증명서', fee: 500 },
  ],
  지방세: [
    { name: '지방세 납세증명서', fee: 0 },
    { name: '지방세 세목별 과세증명서', fee: 0 },
  ],
  건강보험: [
    { name: '건강보험 자격득실확인서', fee: 0 },
    { name: '건강보험료 납부확인서', fee: 0 },
  ],
  국민연금: [{ name: '국민연금 가입증명서', fee: 0 }],
};

const OPTS = {
  deungbon: [
    ['past', '과거의 주소 변동 사항', false],
    ['reason', '세대 구성 사유', false],
    ['rel', '세대원의 세대주와의 관계', true],
    ['rrn', '세대원의 주민등록번호 뒷자리', false],
  ],
  chobon: [
    ['past', '과거의 주소 변동 사항', true],
    ['name', '개인 인적사항 변경 내용', false],
    ['military', '병역 사항', false],
    ['rrn', '주민등록번호 뒷자리', false],
  ],
};

const STEPS = ['서류 선택', '본인 확인', '발급 선택', '수수료', '발급'];
const STEP_OF = { docs: 0, id: 1, finger: 1, options: 2, count: 2, method: 3, card: 3, cash: 3, print: 4, take: 4, done: 4 };

/* ───────── 연습하기 미션 ───────── */
export const MISSION = {
  title: '주민등록표 등본 뽑기',
  steps: [
    '"주민등록" → "주민등록표 등본"을 고르세요',
    '주민번호를 누르고 지문으로 본인 확인',
    '"과거의 주소 변동 사항"을 포함으로 바꾸세요',
    '1부를 현금으로 내고 서류를 꺼내세요',
  ],
  checks: [
    { label: '주민등록표 등본 선택', test: (r) => r.doc === '주민등록표 등본' },
    { label: '과거의 주소 변동 사항 포함', test: (r) => r.opts && r.opts.past === true },
    { label: '1부 발급', test: (r) => r.count === 1 },
    { label: '현금으로 수수료 내기', test: (r) => r.method === 'cash' },
    { label: '서류 꺼내기', test: (r) => r.taken },
  ],
};

/* ───────── 알아보기 순서 ───────── */
export const TOUR = [
  { sel: 'sign', title: '무인민원발급기', text: '주민센터나 구청, 지하철역에 있는 기계예요. 직원 없이 등본 같은 서류를 직접 뽑을 수 있어요.' },
  { sel: 'screen', title: '터치 화면', text: '화면을 손가락으로 눌러서 사용해요. 위쪽은 안내, 아래쪽은 서류 고르는 곳이에요.' },
  { sel: 'groups', title: '증명서 종류', text: '뽑고 싶은 서류의 종류를 고르는 버튼이에요. 등본·초본은 "주민등록"에 있어요.' },
  { sel: 'access', title: '보조 기능', text: '소리를 크게 하거나, 안내를 다시 듣거나, 글씨를 크게 · 화면을 진하게 바꿀 수 있어요. 눈이 침침할 때 써 보세요.' },
  { sel: 'qr', title: 'QR코드 읽는 곳', text: '휴대폰 모바일 신분증 QR코드를 비춰서 본인 확인을 할 때 써요.' },
  { sel: 'out', title: '증명서 나오는 곳', text: '뽑은 서류가 여기로 나와요. 다 나올 때까지 기다렸다가 꺼내세요.' },
  { sel: 'led', title: '투입 금액 표시', text: '넣은 돈이 얼마인지 빨간 숫자로 보여줘요.' },
  { sel: 'coin', title: '동전 넣는 곳', text: '100원, 500원 동전을 넣는 곳이에요.' },
  { sel: 'bill', title: '지폐 넣는 곳', text: '1,000원 지폐를 넣는 곳이에요. 지폐를 펴서 넣어 주세요.' },
  { sel: 'return', title: '반환 버튼', text: '넣은 돈을 다시 돌려받고 싶을 때 누르는 파란 버튼이에요.' },
  { sel: 'change', title: '거스름돈 나오는 곳', text: '거스름돈이 이곳으로 나와요. 잊지 말고 챙기세요.' },
  { sel: 'finger', title: '지문인식기', text: '본인이 맞는지 지문으로 확인하는 곳이에요. 주민등록증을 만들 때 찍은 손가락(보통 오른손 엄지)을 올려요.' },
  { sel: 'card', title: '카드 넣는 곳', text: '수수료를 카드로 낼 때 카드를 꽂는 곳이에요.' },
];

export default function CivilIssuer() {
  const { finish } = useExp();
  const [screen, setScreen] = useState('home');
  const [group, setGroup] = useState(null);
  const [doc, setDoc] = useState(null);
  const [rrn, setRrn] = useState('');
  const [fp, setFp] = useState('idle');
  const [opts, setOpts] = useState({});
  const [count, setCount] = useState(1);
  const [method, setMethod] = useState('');
  const [cashIn, setCashIn] = useState(0);
  const [change, setChange] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paper, setPaper] = useState(false);
  const [notice, setNotice] = useState('');
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [vol, setVol] = useState(3);
  const [volToast, setVolToast] = useState(false);
  const [now, setNow] = useState(new Date());
  const timers = useRef([]);

  const fee = doc ? doc.fee * count : 0;
  const card = useCardPay(() => startPrint());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(id);
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    if (!volToast) return undefined;
    const t = setTimeout(() => setVolToast(false), 1200);
    return () => clearTimeout(t);
  }, [volToast]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const go = (s) => {
    tap();
    setScreen(s);
  };

  const resetAll = () => {
    tap();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setScreen('home');
    setGroup(null);
    setDoc(null);
    setRrn('');
    setFp('idle');
    setCount(1);
    setMethod('');
    setCashIn(0);
    setChange(0);
    setPaper(false);
    setProgress(0);
    card.reset();
  };

  const chooseGroup = (g) => {
    tap();
    if (!DOCS[g]) {
      setNotice(g);
      return;
    }
    setGroup(g);
    setScreen('docs');
  };
  const chooseDoc = (d) => {
    setDoc(d);
    if (d.opts) setOpts(Object.fromEntries(OPTS[d.opts].map(([k, , v]) => [k, v])));
    else setOpts({});
    setRrn('');
    go('id');
  };

  const touchFinger = () => {
    if (screen !== 'finger' || fp !== 'idle') return;
    tap();
    setFp('scanning');
    later(() => {
      beep(1400, 0.2);
      setFp('ok');
      later(() => setScreen(doc && doc.opts ? 'options' : 'count'), 1300);
    }, 2000);
  };

  const afterCount = () => {
    if (fee === 0) {
      setMethod('free');
      startPrint();
    } else go('method');
  };

  function startPrint() {
    setScreen('print');
    setProgress(0);
    [20, 45, 70, 90, 100].forEach((p, i) =>
      later(() => {
        setProgress(p);
        if (p === 100) {
          beep(700, 0.5, 0.05);
          setPaper(true);
          setScreen('take');
        }
      }, 650 * (i + 1))
    );
  }

  const insertCash = (amt) => {
    if (screen !== 'cash' || cashIn >= fee) return;
    beep(500, 0.08, 0.08);
    const sum = cashIn + amt;
    setCashIn(sum);
    if (sum >= fee) {
      setChange(sum - fee);
      later(() => startPrint(), 900);
    }
  };
  const pressReturn = () => {
    tap();
    if (screen === 'cash' && cashIn > 0 && cashIn < fee) {
      setChange(cashIn);
      setCashIn(0);
      setNotice('return');
    }
  };

  const takePaper = () => {
    if (!paper) return;
    tap();
    setPaper(false);
    setScreen('done');
    finish({ doc: doc && doc.name, opts, count, method, taken: true });
  };

  /* ───────── 도우미 안내 ───────── */
  let guide;
  if (notice === 'return') guide = '넣은 돈을 돌려받았어요. 아래 "거스름돈 나오는 곳"을 눌러 챙기고, 다시 돈을 넣어 보세요.';
  else if (notice) guide = `"${notice}" 서류는 이번 체험에 없어요. "확인"을 누르고 "주민등록"을 눌러 보세요.`;
  else
    guide = {
      home: '서류를 뽑는 기계예요. 아래 회색 버튼 중에서 뽑을 서류의 종류를 고르세요. 등본은 "주민등록"에 있어요.',
      docs: `${group} 서류 목록이에요. 필요한 서류를 눌러 주세요.`,
      id:
        rrn.length < 13
          ? '본인 주민등록번호를 누르는 화면이에요. 체험이니 아무 숫자나 13개 눌러 보세요. 잘못 누르면 "정정"을 누르면 돼요.'
          : '번호를 다 누르셨어요. "확인"을 눌러 주세요.',
      finger: {
        idle: '지문으로 본인 확인을 해요. 화면 오른쪽 기계의 "지문인식기"에 손가락을 올려 주세요. (반짝이는 곳을 눌러 보세요)',
        scanning: '지문을 읽고 있어요. 손가락을 떼지 말고 잠시 기다려 주세요.',
        ok: '본인 확인이 끝났어요!',
      }[fp],
      options:
        '서류에 넣을 내용을 고르는 화면이에요. 낼 곳(은행, 학교 등)에서 넣어 달라는 내용만 "포함"을 누르세요. 잘 모르시면 그대로 "다음"을 눌러도 돼요.',
      count: '몇 장 뽑을지 고르세요. + 를 누르면 장수가 늘어나요. 다 되면 "다음"을 누르세요.',
      method: '서류값(수수료)을 낼 방법을 고르세요. 동전·지폐는 "현금", 카드는 "카드"를 누르세요.',
      card: CARD_GUIDE[card.st],
      cash:
        cashIn < fee
          ? '오른쪽 기계의 "동전 넣는 곳"이나 "지폐 넣는 곳"에 돈을 넣어요. 반짝이는 동전을 눌러 넣어 보세요. 빨간 숫자로 넣은 돈이 보여요.'
          : '돈을 다 넣었어요! 거스름돈은 오른쪽 기계 아래로 나와요.',
      print: '서류를 뽑는 중이에요. 다 나올 때까지 기다려 주세요.',
      take: '서류가 나왔어요! 화면 바로 아래 "증명서 나오는 곳"에서 반짝이는 서류를 눌러 꺼내 가세요.',
      done: `다 됐어요! 서류${change ? '와 오른쪽 아래 거스름돈' : ''}${method === 'card' ? ', 카드' : ''}를 꼭 챙기세요.`,
    }[screen];
  const on = useGuide(guide);
  const hl = (cond) => (on && cond ? ' hl' : '');

  const stepIdx = STEP_OF[screen];
  const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const homeVoice = '발급을 원하시는 증명서를 선택하십시오.';

  const accessBar = (
    <div className="cv-access" data-tour="access">
      <button
        onClick={() => {
          tap();
          setVol((v) => Math.min(5, v + 1));
          setVolToast(true);
        }}
      >
        🔊 소리크게
      </button>
      <button
        onClick={() => {
          tap();
          setVol((v) => Math.max(0, v - 1));
          setVolToast(true);
        }}
      >
        🔉 소리작게
      </button>
      <button onClick={() => speak(screen === 'home' ? homeVoice : guide)}>↺ 다시듣기</button>
      <button onClick={stopSpeak}>■ 음성중지</button>
      <button className={big ? 'on' : ''} onClick={() => setBig(!big)}>
        큰글씨보기
      </button>
      <button className={contrast ? 'on' : ''} onClick={() => setContrast(!contrast)}>
        고대비보기
      </button>
    </div>
  );

  const renderScreen = () => {
    if (screen === 'home') {
      return (
        <div className="cv-home">
          <div className="cv-info">
            <div className="cv-info-text">
              <b>모바일 신분증으로도</b>
              <b>발급할 수 있어요</b>
              <small>휴대폰의 모바일 신분증 QR을
                <br />
                아래 QR코드 리더에 비춰 주세요</small>
            </div>
            <div className="cv-qr" aria-hidden="true">
              {Array.from({ length: 49 }).map((_, i) => (
                <span key={i} className={(i * 7 + (i % 5) * 3) % 4 === 0 || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].includes(i) ? 'on' : ''} />
              ))}
            </div>
          </div>
          <div className="cv-band">발급을 원하시는 증명서를 선택하십시오.</div>
          <div className="cv-groups" data-tour="groups">
            {GROUPS.map((g) => (
              <button key={g} className={`cv-group${hl(g === '주민등록')}`} onClick={() => chooseGroup(g)}>
                {g}
              </button>
            ))}
          </div>
          {accessBar}
        </div>
      );
    }

    let body = null;
    switch (screen) {
      case 'docs':
        body = (
          <div className="cv-page">
            <h2 className="cv-h2">{group}</h2>
            <p className="cv-sub">발급받을 서류를 선택하세요</p>
            <div className="cv-doclist">
              {DOCS[group].map((d) => (
                <button key={d.name} className={`cv-doc${hl(d.name === '주민등록표 등본')}`} onClick={() => chooseDoc(d)}>
                  <span>{d.name}</span>
                  <small>{d.fee ? `수수료 ${won(d.fee)}` : '무료'}</small>
                </button>
              ))}
            </div>
          </div>
        );
        break;
      case 'id':
        body = (
          <div className="cv-page">
            <h2 className="cv-h2">주민등록번호를 입력하세요</h2>
            <p className="cv-sub">{doc.name} 발급을 위해 본인 확인이 필요합니다</p>
            <div className="cv-rrn">
              {Array.from({ length: 13 }).map((_, i) => (
                <span key={i} className={`cv-rrn-box${i === rrn.length ? ' cur' : ''}${i === 6 ? ' gap' : ''}`}>
                  {rrn[i] ? (i < 6 ? rrn[i] : '●') : ''}
                </span>
              ))}
            </div>
            <Keypad
              className="cv-kp"
              highlight={on && rrn.length < 13}
              onKey={(k) => setRrn((r) => (r.length < 13 ? r + k : r))}
              onDelete={() => setRrn((r) => r.slice(0, -1))}
              onClear={() => setRrn('')}
            />
            <button
              className={`cv-btn main wide${hl(rrn.length === 13)}`}
              disabled={rrn.length < 13}
              onClick={() => {
                setFp('idle');
                go('finger');
              }}
            >
              확인
            </button>
          </div>
        );
        break;
      case 'finger':
        body = (
          <div className="cv-page center">
            <div className={`cv-finger ${fp}`}>{fp === 'ok' ? '✓' : '☝'}</div>
            <h2 className="cv-h2">
              {fp === 'idle' && '지문인식기에 손가락을 올려 주세요'}
              {fp === 'scanning' && '지문을 확인하고 있습니다'}
              {fp === 'ok' && '본인 확인이 완료되었습니다'}
            </h2>
            <p className="cv-sub">
              {fp === 'idle' && '주민등록증을 만들 때 등록한 손가락(보통 오른손 엄지)'}
              {fp === 'scanning' && '손가락을 떼지 마세요'}
              {fp === 'ok' && '잠시 후 다음 화면으로 넘어갑니다'}
            </p>
            {fp === 'idle' && <div className="arrow-right">오른쪽 기계의 지문인식기 ▶</div>}
          </div>
        );
        break;
      case 'options':
        body = (
          <div className="cv-page">
            <h2 className="cv-h2">발급 내용을 선택하세요</h2>
            <p className="cv-sub">{doc.name}</p>
            <div className="cv-opts">
              {OPTS[doc.opts].map(([k, label]) => (
                <div className="cv-opt" key={k}>
                  <span>{label}</span>
                  <div className="cv-seg">
                    <button
                      className={`${opts[k] ? 'on' : ''}${hl(k === 'past' && !opts[k])}`}
                      onClick={() => {
                        tap();
                        setOpts({ ...opts, [k]: true });
                      }}
                    >
                      포함
                    </button>
                    <button
                      className={!opts[k] ? 'on' : ''}
                      onClick={() => {
                        tap();
                        setOpts({ ...opts, [k]: false });
                      }}
                    >
                      미포함
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className={`cv-btn main wide${hl(true)}`} onClick={() => go('count')}>
              다음
            </button>
          </div>
        );
        break;
      case 'count':
        body = (
          <div className="cv-page center">
            <h2 className="cv-h2">발급 부수를 선택하세요</h2>
            <p className="cv-sub">{doc.name}</p>
            <div className="cv-count">
              <button
                onClick={() => {
                  tap();
                  setCount((c) => Math.max(1, c - 1));
                }}
                aria-label="한 부 줄이기"
              >
                −
              </button>
              <b>{count}부</b>
              <button
                onClick={() => {
                  tap();
                  setCount((c) => Math.min(5, c + 1));
                }}
                aria-label="한 부 늘리기"
              >
                +
              </button>
            </div>
            <div className="cv-fee">
              수수료 <b>{fee ? won(fee) : '무료'}</b>
            </div>
            <button className={`cv-btn main wide${hl(true)}`} onClick={afterCount}>
              다음
            </button>
          </div>
        );
        break;
      case 'method':
        body = (
          <div className="cv-page center">
            <h2 className="cv-h2">수수료 납부 방법을 선택하세요</h2>
            <div className="cv-fee">
              납부하실 금액 <b>{won(fee)}</b>
            </div>
            <div className="cv-method">
              <button
                className={`cv-method-btn${hl(true)}`}
                onClick={() => {
                  setMethod('cash');
                  setCashIn(0);
                  setChange(0);
                  go('cash');
                }}
              >
                <span>💰</span>현금<small>동전 · 1,000원권</small>
              </button>
              <button
                className="cv-method-btn"
                onClick={() => {
                  setMethod('card');
                  go('card');
                  card.start();
                }}
              >
                <span>💳</span>카드<small>신용 · 체크카드</small>
              </button>
            </div>
          </div>
        );
        break;
      case 'card':
        body = (
          <div className="cv-page center">
            <div className="cv-fee">
              납부 금액 <b>{won(fee)}</b>
            </div>
            {card.st === 'processing' ? <div className="spinner navy" /> : <div className="cv-pic">💳</div>}
            <h2 className="cv-h2">{(CARD_TEXT[card.st] || {}).title}</h2>
            <p className="cv-sub">{(CARD_TEXT[card.st] || {}).sub}</p>
            {(card.st === 'ready' || card.st === 'remove') && <div className="arrow-right">오른쪽 기계의 카드 넣는 곳 ▶</div>}
          </div>
        );
        break;
      case 'cash':
        body = (
          <div className="cv-page center">
            <h2 className="cv-h2">돈을 넣어 주세요</h2>
            <div className="cv-cash">
              <div>
                <span>내실 금액</span>
                <b>{won(fee)}</b>
              </div>
              <div>
                <span>넣은 금액</span>
                <b className="blue">{won(cashIn)}</b>
              </div>
              <div>
                <span>남은 금액</span>
                <b className="red">{won(Math.max(fee - cashIn, 0))}</b>
              </div>
            </div>
            <p className="cv-sub">100원 · 500원 동전, 1,000원 지폐를 넣을 수 있어요</p>
            {cashIn < fee && <div className="arrow-right">오른쪽 기계의 동전 · 지폐 넣는 곳 ▶</div>}
          </div>
        );
        break;
      case 'print':
        body = (
          <div className="cv-page center">
            <div className="cv-pic">🖨️</div>
            <h2 className="cv-h2">발급 중입니다</h2>
            <p className="cv-sub">서류가 모두 나올 때까지 기다려 주세요</p>
            <div className="cv-progress">
              <div style={{ width: `${progress}%` }} />
            </div>
            <b className="cv-progress-num">{progress}%</b>
          </div>
        );
        break;
      case 'take':
        body = (
          <div className="cv-page center">
            <div className="cv-pic">📄</div>
            <h2 className="cv-h2">서류가 출력되었습니다</h2>
            <p className="cv-sub">화면 아래 &lsquo;증명서 나오는 곳&rsquo;에서 서류를 꺼내 가세요</p>
            <div className="arrow-down">▼ 증명서 나오는 곳 ▼</div>
          </div>
        );
        break;
      case 'done':
        body = (
          <div className="cv-page center">
            <div className="ok-circle">✓</div>
            <h2 className="cv-h2">발급이 완료되었습니다</h2>
            <p className="cv-sub">
              {change > 0 && (
                <>
                  거스름돈 <b>{won(change)}</b>을 챙겨 주세요.
                  <br />
                </>
              )}
              이용해 주셔서 감사합니다.
            </p>
            <button className={`cv-btn main wide${hl(true)}`} onClick={resetAll}>
              처음으로
            </button>
          </div>
        );
        break;
      default:
        body = null;
    }

    const showBack = ['docs', 'id', 'options', 'count', 'method'].includes(screen);
    return (
      <div className="cv-inner">
        <div className="cv-topbar">
          <span>무인민원발급기</span>
          <span className="cv-date">{dateStr}</span>
        </div>
        <div className="cv-steps">
          {STEPS.map((s, i) => (
            <span key={s} className={i === stepIdx ? 'on' : i < stepIdx ? 'past' : ''}>
              {s}
            </span>
          ))}
        </div>
        <div className="cv-body">{body}</div>
        <div className="cv-foot">
          {showBack && (
            <button
              className="cv-btn"
              onClick={() => {
                tap();
                const back = { docs: 'home', id: 'docs', options: 'id', count: doc && doc.opts ? 'options' : 'id', method: 'count' }[screen];
                setScreen(back);
              }}
            >
              ◀ 이전
            </button>
          )}
          <button className="cv-btn" onClick={resetAll}>
            ⌂ 처음으로
          </button>
        </div>
        {accessBar}
      </div>
    );
  };

  return (
    <Scaler width={1040} height={1240}>
      <div className="cv">
        {/* 왼쪽: 발급기 본체 */}
        <div className="cv-main">
          <div className="cv-sign" data-tour="sign">
            <span className="cv-sign-qr">QR</span>
            <span className="cv-sign-dot">·</span>
            무인 민원발급창구
            <span className="cv-sign-cam" />
          </div>
          <div className="cv-frame">
            <div
              className={`scr cv-screen${big ? ' big' : ''}${contrast ? ' contrast' : ''}`}
              data-tour="screen"
            >
              {renderScreen()}
              {notice && (
                <Modal>
                  <h3 className="cv-h2">{notice === 'return' ? '돈을 돌려드렸습니다' : '안내'}</h3>
                  <p className="cv-sub">
                    {notice === 'return'
                      ? '거스름돈 나오는 곳에서 돈을 챙겨 주세요.'
                      : `"${notice}" 서류는 이번 체험에서 준비 중이에요. "주민등록"을 눌러 보세요.`}
                  </p>
                  <button
                    className={`cv-btn main wide${hl(true)}`}
                    onClick={() => {
                      tap();
                      setNotice('');
                    }}
                  >
                    확인
                  </button>
                </Modal>
              )}
              {volToast && <div className="scr-toast">🔊 음량 {vol}</div>}
            </div>
          </div>
          <div className="cv-under">
            <div className="cv-qrreader" data-tour="qr">
              <span className="cv-label">QR코드</span>
              <div className="cv-qrwin" />
            </div>
            <div className="cv-out" data-tour="out">
              <span className="cv-label">증명서 나오는 곳</span>
              <div className="cv-out-area">
                {paper && (
                  <button className={`v-paper${hl(true)}`} onClick={takePaper} aria-label="서류 꺼내기">
                    <b>{doc && doc.name}</b>
                    <span />
                    <span />
                    <span />
                    <span />
                  </button>
                )}
              </div>
              <div className="cv-out-slot" />
            </div>
            <div className="cv-rcpt">
              <span className="cv-label">영수증</span>
              <div className="cv-rcpt-slot" />
            </div>
          </div>
          <div className="cv-base" />
        </div>

        {/* 오른쪽: 결제 · 본인확인 부스 */}
        <div className="cv-side">
          <div className="cv-side-face">
            <div className="cv-led" data-tour="led">
              <span>투입금액</span>
              <b>{cashIn}</b>
            </div>
            <div className="cv-cashrow">
              <div className="cv-coin" data-tour="coin">
                <span className="cv-label">동전 넣는 곳</span>
                <div className="cv-coin-slot" />
                {screen === 'cash' && cashIn < fee && (
                  <div className="cv-wallet">
                    <button className={`v-coin${hl(true)}`} onClick={() => insertCash(100)}>
                      100
                    </button>
                    <button className="v-coin gold" onClick={() => insertCash(500)}>
                      500
                    </button>
                  </div>
                )}
              </div>
              <button className="cv-return" data-tour="return" onClick={pressReturn} aria-label="반환 버튼">
                반환
              </button>
            </div>
            <div className="cv-bill" data-tour="bill">
              <span className="cv-label">지폐 넣는 곳</span>
              <div className="cv-bill-slot" />
              <small>1,000원권만 가능</small>
              {screen === 'cash' && cashIn < fee && (
                <button className="v-bill" onClick={() => insertCash(1000)}>
                  1,000원
                </button>
              )}
            </div>
            <div className="cv-change" data-tour="change">
              <span className="cv-label">거스름돈 나오는 곳</span>
              <button
                className={`cv-change-tray${change > 0 ? ' has' : ''}${hl(change > 0 && (screen === 'done' || notice === 'return'))}`}
                onClick={() => {
                  if (change > 0 && (screen === 'done' || notice === 'return' || screen === 'cash')) {
                    tap();
                    setChange(0);
                  }
                }}
              >
                {change > 0 ? `🪙 ${won(change)}` : ''}
              </button>
            </div>
            <div className="cv-idrow">
              <div className="cv-fp" data-tour="finger">
                <span className="cv-label">지문인식기</span>
                <button
                  className={`cv-fp-pad ${fp}${hl(screen === 'finger' && fp === 'idle')}`}
                  onClick={touchFinger}
                  aria-label="지문인식기에 손가락 올리기"
                >
                  {screen === 'finger' && fp === 'idle' ? '☝' : ''}
                </button>
              </div>
              <CardSlot st={card.st} onClick={card.clickCard} highlight={on} label="카드" className="cv-card" />
            </div>
            <div className="cv-phone-jack">
              <span />
              이어폰
            </div>
          </div>
        </div>
      </div>
    </Scaler>
  );
}
