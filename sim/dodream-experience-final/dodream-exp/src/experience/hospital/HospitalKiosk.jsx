import { useEffect, useRef, useState } from 'react';
import Scaler from '../shared/Scaler';
import Modal from '../shared/Modal';
import Keypad from '../shared/Keypad';
import CardSlot from '../shared/CardSlot';
import { useCardPay, CARD_TEXT, CARD_GUIDE } from '../shared/useCardPay';
import { useGuide, useExp, speak } from '../guide/GuideContext';
import { won, tap, beep } from '../shared/utils';

/* 진료과 · 의사 (가상의 '두드림병원') */
const DEPTS = [
  { id: 'im', name: '내과', icon: '🩺', wait: 4, docs: ['김건강 원장', '이튼튼 원장'] },
  { id: 'os', name: '정형외과', icon: '🦴', wait: 6, docs: ['박뼈대 원장', '최관절 원장'] },
  { id: 'ent', name: '이비인후과', icon: '👂', wait: 2, docs: ['정코목 원장'] },
  { id: 'eye', name: '안과', icon: '👁️', wait: 3, docs: ['한눈빛 원장'] },
  { id: 'derm', name: '피부과', icon: '🧴', wait: 1, docs: ['윤피부 원장'] },
  { id: 'fm', name: '가정의학과', icon: '🏠', wait: 5, docs: ['서가족 원장'] },
  { id: 'neuro', name: '신경과', icon: '🧠', wait: 2, docs: ['노신경 원장'] },
  { id: 'rehab', name: '재활의학과', icon: '🚶', wait: 3, docs: ['구재활 원장'] },
];

/* 수납 내역 (체험용 금액) */
const BILL = [
  { name: '진찰료', price: 4500 },
  { name: '주사료', price: 1300 },
  { name: '물리치료', price: 2800 },
];
const BILL_TOTAL = BILL.reduce((s, b) => s + b.price, 0);

/* ───────── 연습하기 미션 ───────── */
export const MISSION = {
  title: '정형외과 진료 접수하기',
  steps: [
    '"접수"를 누르세요',
    '주민등록번호로 본인 확인을 하세요',
    '"정형외과"를 고르고 원하는 선생님을 고르세요',
    '접수증을 꺼내 가세요',
  ],
  checks: [
    { label: '접수 선택', test: (r) => r.type === 'reception' },
    { label: '정형외과 선택', test: (r) => r.dept === '정형외과' },
    { label: '접수증 받기', test: (r) => r.ticket },
  ],
};

/* ───────── 알아보기 순서 ───────── */
export const TOUR = [
  { sel: 'screen', title: '터치 화면', text: '병원 입구에 있는 접수·수납 기계예요. 화면을 눌러서 사용해요.' },
  { sel: 'tiles', title: '접수와 수납', text: '"접수"는 진료 받기 전에 이름을 올리는 것, "수납"은 진료가 끝나고 진료비를 내는 거예요.' },
  { sel: 'notice', title: '병원 안내', text: '병원에서 알리는 내용이 나와요. 예방접종 기간 같은 소식을 볼 수 있어요.' },
  { sel: 'access', title: '보조 기능', text: '"고대비"는 화면을 진하게, "낮은 화면"은 휠체어에 앉아서도 누르기 쉽게, "음성안내"는 소리로 알려줘요.' },
  { sel: 'keypad', title: '숫자 버튼', text: '화면 대신 손으로 눌러서 번호를 입력하는 버튼이에요. 화면 숫자를 눌러도 돼요.' },
  { sel: 'scanner', title: '바코드 리더', text: '진료카드나 모바일 진료권의 바코드를 비추는 곳이에요.' },
  { sel: 'card', title: '카드 넣는 곳', text: '진료비를 카드로 낼 때 카드를 꽂는 곳이에요.' },
  { sel: 'printer', title: '출력구', text: '접수증, 영수증, 처방전이 여기로 나와요.' },
];

export default function HospitalKiosk() {
  const { finish } = useExp();
  const [screen, setScreen] = useState('home');
  const [type, setType] = useState('');
  const [rrn, setRrn] = useState('');
  const [dept, setDept] = useState(null);
  const [doctor, setDoctor] = useState('');
  const [paper, setPaper] = useState(null);
  const [notice, setNotice] = useState('');
  const [contrast, setContrast] = useState(false);
  const [low, setLow] = useState(false);
  const [ticketNo, setTicketNo] = useState(0);
  const [now, setNow] = useState(new Date());
  const timers = useRef([]);

  const card = useCardPay(() => setScreen('docs'));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(id);
      timers.current.forEach(clearTimeout);
    };
  }, []);
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
    setType('');
    setRrn('');
    setDept(null);
    setDoctor('');
    setPaper(null);
    card.reset();
  };

  const keyIn = (k) => {
    if (screen !== 'id') return;
    setRrn((r) => (r.length < 13 ? r + k : r));
  };

  const printOut = (kind) => {
    setScreen('printing');
    later(() => {
      beep(700, 0.5, 0.05);
      setPaper(kind);
      setScreen('take');
    }, 2200);
  };

  const takePaper = () => {
    if (!paper) return;
    tap();
    const kind = paper;
    setPaper(null);
    setScreen('done');
    finish({ type, dept: dept && dept.name, ticket: kind === 'ticket', paid: kind === 'receipt' });
  };

  /* ───────── 도우미 안내 ───────── */
  let guide;
  if (notice) guide = '안내창이에요. 내용을 읽고 "확인"을 눌러 주세요.';
  else
    guide = {
      home: '병원에 오면 먼저 "접수"를 해요. 진료가 끝나고 돈을 낼 때는 "수납"을 눌러요.',
      auth: '본인 확인 방법을 고르는 화면이에요. "주민등록번호 입력"을 눌러 주세요.',
      id:
        rrn.length < 13
          ? '주민등록번호 13자리를 눌러 주세요. 화면 숫자나 아래 기계의 숫자 버튼 어느 쪽을 눌러도 돼요. 체험이니 아무 숫자나 괜찮아요.'
          : '번호를 다 누르셨어요. "확인"을 눌러 주세요.',
      who: '화면의 이름이 내 이름이 맞는지 확인하는 거예요. 맞으면 "예"를 눌러 주세요.',
      dept: '진료 받을 과를 고르세요. 뼈나 관절이 아프면 "정형외과", 감기나 배가 아프면 "내과"예요.',
      doctor: '진료 받을 선생님을 고르세요. 기다리는 사람 수도 함께 보여줘요.',
      confirm: '접수 내용이 맞는지 확인하고 "접수하기"를 눌러 주세요.',
      bill: '오늘 낼 진료비 내역이에요. 금액을 확인하고 "결제하기"를 눌러 주세요.',
      card: CARD_GUIDE[card.st],
      docs: '처방전이 있어요. "출력"을 누르면 영수증과 처방전이 나와요. 처방전은 약국에 내요.',
      printing: '종이가 나오는 중이에요. 잠시만 기다려 주세요.',
      take: '종이가 나왔어요! 화면 아래 "출력구"에서 반짝이는 종이를 눌러 꺼내 가세요.',
      done:
        type === 'reception'
          ? `접수가 끝났어요! 대기번호 ${ticketNo}번이에요. 이름이 불리면 진료실로 들어가세요.`
          : '수납이 끝났어요! 처방전은 약국에 내면 약을 받을 수 있어요. 카드도 챙기세요.',
    }[screen];
  const on = useGuide(guide);
  const hl = (cond) => (on && cond ? ' hl' : '');

  const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(
    2,
    '0'
  )}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return (
          <div className="hp-home">
            <h2 className="hp-hero">
              <span className="hp-em">접수 · 수납</span>을
              <br />
              진행하세요!
            </h2>
            <div className="hp-tiles" data-tour="tiles">
              <button
                className={`hp-tile${hl(true)}`}
                onClick={() => {
                  setType('reception');
                  go('auth');
                }}
              >
                <span className="hp-tile-icon">📋</span>
                접수
              </button>
              <button
                className="hp-tile"
                onClick={() => {
                  setType('payment');
                  go('auth');
                }}
              >
                <span className="hp-tile-icon">💵</span>
                수납
              </button>
            </div>
            <div className="hp-notices" data-tour="notice">
              <div className="hp-notice">
                <b>📢</b> 진료를 받으시려면 먼저 접수를 해 주세요.
              </div>
              <div className="hp-notice">
                <b>💉</b> 독감 예방접종 기간입니다. 접수 시 &lsquo;가정의학과&rsquo;를 선택하세요.
              </div>
            </div>
          </div>
        );
      case 'auth':
        return (
          <div className="hp-page">
            <h2 className="hp-h2">본인 확인 방법을 선택하세요</h2>
            <div className="hp-list">
              <button
                className={`hp-listbtn${hl(true)}`}
                onClick={() => {
                  setRrn('');
                  go('id');
                }}
              >
                <span>🔢</span>주민등록번호 입력
              </button>
              <button
                className="hp-listbtn"
                onClick={() => {
                  tap();
                  setNotice('진료카드 바코드는 아래 바코드 리더에 비추면 돼요. 이번 체험에서는 "주민등록번호 입력"으로 해 볼게요.');
                }}
              >
                <span>💳</span>진료카드 · 바코드
              </button>
              <button
                className="hp-listbtn"
                onClick={() => {
                  tap();
                  setNotice('휴대폰의 모바일 신분증 QR을 바코드 리더에 비추면 돼요. 이번 체험에서는 "주민등록번호 입력"으로 해 볼게요.');
                }}
              >
                <span>📱</span>모바일 신분증
              </button>
            </div>
          </div>
        );
      case 'id':
        return (
          <div className="hp-page">
            <h2 className="hp-h2">주민등록번호를 입력하세요</h2>
            <div className="hp-rrn">
              {rrn.slice(0, 6).padEnd(6, '_')} - {rrn.length > 6 ? '●'.repeat(rrn.length - 6).padEnd(7, '_') : '_______'}
            </div>
            <Keypad
              className="hp-kp"
              highlight={on && rrn.length < 13}
              onKey={keyIn}
              onDelete={() => setRrn((r) => r.slice(0, -1))}
              onClear={() => setRrn('')}
            />
            <button className={`hp-btn main${hl(rrn.length === 13)}`} disabled={rrn.length < 13} onClick={() => go('who')}>
              확인
            </button>
          </div>
        );
      case 'who':
        return (
          <div className="hp-page center">
            <div className="hp-pic">🧑‍🦳</div>
            <h2 className="hp-h2">
              <b className="hp-em">두드림</b> 님이 맞으신가요?
            </h2>
            <p className="hp-sub">생년월일 {rrn.slice(0, 2)}.{rrn.slice(2, 4)}.{rrn.slice(4, 6)}</p>
            <div className="hp-btnrow">
              <button className="hp-btn gray" onClick={() => go('id')}>
                아니요
              </button>
              <button
                className={`hp-btn main${hl(true)}`}
                onClick={() => go(type === 'reception' ? 'dept' : 'bill')}
              >
                예
              </button>
            </div>
          </div>
        );
      case 'dept':
        return (
          <div className="hp-page">
            <h2 className="hp-h2">진료과를 선택하세요</h2>
            <div className="hp-depts">
              {DEPTS.map((d) => (
                <button
                  key={d.id}
                  className={`hp-dept${hl(d.id === 'os')}`}
                  onClick={() => {
                    setDept(d);
                    go('doctor');
                  }}
                >
                  <span className="hp-dept-icon">{d.icon}</span>
                  {d.name}
                  <small>대기 {d.wait}명</small>
                </button>
              ))}
            </div>
          </div>
        );
      case 'doctor':
        return (
          <div className="hp-page">
            <h2 className="hp-h2">{dept.name} 선생님을 선택하세요</h2>
            <div className="hp-list">
              {dept.docs.map((d, i) => (
                <button
                  key={d}
                  className={`hp-listbtn${hl(i === 0)}`}
                  onClick={() => {
                    setDoctor(d);
                    go('confirm');
                  }}
                >
                  <span>👨‍⚕️</span>
                  {d}
                  <small>{i === 0 ? '진료 중 · 대기 ' + dept.wait + '명' : '진료 중 · 대기 ' + (dept.wait - 2 > 0 ? dept.wait - 2 : 1) + '명'}</small>
                </button>
              ))}
            </div>
            <button className="hp-btn gray" onClick={() => go('dept')}>
              이전
            </button>
          </div>
        );
      case 'confirm':
        return (
          <div className="hp-page">
            <h2 className="hp-h2">접수 내용을 확인하세요</h2>
            <div className="hp-table">
              <div>
                <span>이름</span>
                <b>두드림</b>
              </div>
              <div>
                <span>진료과</span>
                <b>{dept.name}</b>
              </div>
              <div>
                <span>담당 선생님</span>
                <b>{doctor}</b>
              </div>
              <div>
                <span>예상 대기</span>
                <b>약 {dept.wait * 5}분</b>
              </div>
            </div>
            <div className="hp-btnrow">
              <button className="hp-btn gray" onClick={() => go('doctor')}>
                이전
              </button>
              <button
                className={`hp-btn main${hl(true)}`}
                onClick={() => {
                  tap();
                  setTicketNo(20 + Math.floor(Math.random() * 20));
                  printOut('ticket');
                }}
              >
                접수하기
              </button>
            </div>
          </div>
        );
      case 'bill':
        return (
          <div className="hp-page">
            <h2 className="hp-h2">오늘 진료비 내역</h2>
            <div className="hp-table">
              {BILL.map((b) => (
                <div key={b.name}>
                  <span>{b.name}</span>
                  <b>{won(b.price)}</b>
                </div>
              ))}
              <div className="sum">
                <span>낼 금액</span>
                <b>{won(BILL_TOTAL)}</b>
              </div>
            </div>
            <p className="hp-small">※ 체험용 금액이에요</p>
            <button
              className={`hp-btn main${hl(true)}`}
              onClick={() => {
                go('card');
                card.start();
              }}
            >
              결제하기
            </button>
          </div>
        );
      case 'card':
        return (
          <div className="hp-page center">
            <p className="hp-sub">
              결제 금액 <b className="hp-em">{won(BILL_TOTAL)}</b>
            </p>
            {card.st === 'processing' ? <div className="spinner orange" /> : <div className="hp-pic">💳</div>}
            <h2 className="hp-h2">{(CARD_TEXT[card.st] || {}).title}</h2>
            <p className="hp-sub">{(CARD_TEXT[card.st] || {}).sub}</p>
            {(card.st === 'ready' || card.st === 'remove') && <div className="arrow-down">▼ 아래 카드 넣는 곳 ▼</div>}
          </div>
        );
      case 'docs':
        return (
          <div className="hp-page center">
            <div className="ok-circle">✓</div>
            <h2 className="hp-h2">결제가 완료되었습니다</h2>
            <p className="hp-sub">
              처방전이 있습니다.
              <br />
              영수증과 처방전을 출력합니다.
            </p>
            <button
              className={`hp-btn main${hl(true)}`}
              onClick={() => {
                tap();
                printOut('receipt');
              }}
            >
              출력
            </button>
          </div>
        );
      case 'printing':
        return (
          <div className="hp-page center">
            <div className="spinner orange" />
            <h2 className="hp-h2">출력 중입니다</h2>
            <p className="hp-sub">잠시만 기다려 주세요</p>
          </div>
        );
      case 'take':
        return (
          <div className="hp-page center">
            <div className="hp-pic">🧾</div>
            <h2 className="hp-h2">{paper === 'ticket' ? '접수증이 나왔습니다' : '영수증 · 처방전이 나왔습니다'}</h2>
            <p className="hp-sub">아래 출력구에서 가져가세요</p>
            <div className="arrow-down">▼ 출력구 ▼</div>
          </div>
        );
      case 'done':
        return (
          <div className="hp-page center">
            {type === 'reception' ? (
              <>
                <p className="hp-sub">대기번호</p>
                <div className="hp-ticketno">{ticketNo}</div>
                <h2 className="hp-h2">접수가 완료되었습니다</h2>
                <p className="hp-sub">
                  {dept && dept.name} 앞에서 기다려 주세요.
                  <br />
                  이름이 불리면 진료실로 들어가세요.
                </p>
              </>
            ) : (
              <>
                <div className="ok-circle">✓</div>
                <h2 className="hp-h2">수납이 완료되었습니다</h2>
                <p className="hp-sub">처방전을 약국에 내시면 약을 받을 수 있어요.</p>
              </>
            )}
            <button className={`hp-btn main${hl(true)}`} onClick={resetAll}>
              처음 화면
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Scaler width={560} height={1240}>
      <div className="hp">
        <div className="hp-top">
          <div className={`scr hp-screen${contrast ? ' contrast' : ''}${low ? ' low' : ''}`} data-tour="screen">
            <div className="hp-head">
              <span className="hp-logo">
                <span className="hp-cross">✚</span> 두드림병원
              </span>
              <span className="hp-date">
                {dateStr}
                <b>{timeStr}</b>
              </span>
              <button className="hp-homebtn" onClick={resetAll}>
                처음화면
              </button>
            </div>
            <div className="hp-content">{renderScreen()}</div>
            <div className="hp-access" data-tour="access">
              <button className={contrast ? 'on' : ''} onClick={() => setContrast(!contrast)}>
                <span>◐</span>고대비
              </button>
              <button className={low ? 'on' : ''} onClick={() => setLow(!low)}>
                <span>♿</span>낮은 화면
              </button>
              <button onClick={() => speak(guide)}>
                <span>🔈</span>음성안내
              </button>
            </div>
            {notice && (
              <Modal>
                <p className="hp-sub">{notice}</p>
                <button
                  className={`hp-btn main${hl(true)}`}
                  onClick={() => {
                    tap();
                    setNotice('');
                  }}
                >
                  확인
                </button>
              </Modal>
            )}
          </div>
        </div>
        <div className="hp-body">
          <div className="hp-row">
            <div className="hp-keypad" data-tour="keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  className="hp-key"
                  onClick={() => {
                    tap();
                    if (/\d/.test(k)) keyIn(k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="hp-right">
              <div className="hp-scanner" data-tour="scanner">
                <div className="hp-scanner-win" />
                <span className="hw-label dark">바코드 리더</span>
              </div>
              <CardSlot st={card.st} onClick={card.clickCard} highlight={on} label="카드 넣는 곳" className="hp-card" />
            </div>
          </div>
          <div className="hp-printer" data-tour="printer">
            <div className="hp-printer-area">
              {paper && (
                <button className={`v-receipt big${hl(true)}`} onClick={takePaper} aria-label="종이 꺼내기">
                  <b>두드림병원</b>
                  {paper === 'ticket' ? (
                    <>
                      <span>접수증</span>
                      <span className="big-no">{ticketNo}</span>
                      <span>{dept && dept.name}</span>
                    </>
                  ) : (
                    <>
                      <span>영수증 · 처방전</span>
                      <span>{won(BILL_TOTAL)}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="hp-printer-slot" />
            <span className="hw-label dark">접수증 · 영수증 · 처방전</span>
          </div>
          <div className="hp-sticker">두드림 메디컬</div>
        </div>
      </div>
    </Scaler>
  );
}
