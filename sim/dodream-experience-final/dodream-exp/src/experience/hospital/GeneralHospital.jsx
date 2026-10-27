import { useEffect, useRef, useState } from 'react';
import Scaler from '../shared/Scaler';
import Modal from '../shared/Modal';
import CardSlot from '../shared/CardSlot';
import { useCardPay } from '../shared/useCardPay';
import { useGuide, useExp } from '../guide/GuideContext';
import { won, tap, beep } from '../shared/utils';

/*
 * 종합병원 접수 · 수납 · 처방전 발행기 체험 (가상의 '두드림 종합병원')
 * 실제 종합병원 무인 접수기의 진행 순서를 참고했고, 병원 이름 · 로고는 쓰지 않았어요.
 * 접수: 접수하기 → 번호 입력 → 본인 확인 → 진료과목 → 접수완료 → 접수증 출력 → 5초 뒤 처음 화면
 * 수납: 수납·처방전 → 번호 입력 → 본인 확인 → 진료비 내역 → 카드 결제 → 영수증·처방전 출력
 */

const DEPTS = [
  { name: '호흡기내과', icon: '🫁', wait: 4 },
  { name: '심장내과', icon: '💓', wait: 2 },
  { name: '신경외과', icon: '🧠', wait: 5 },
  { name: '정형외과', icon: '🦴', wait: 6 },
  { name: '비뇨기과', icon: '💧', wait: 1 },
  { name: '가정의학과', icon: '🩺', wait: 3 },
];

const BILL = [
  { name: '진찰료', price: 18600 },
  { name: '검사료', price: 12400 },
  { name: '주사료', price: 3200 },
];
const BILL_TOTAL = BILL.reduce((s, b) => s + b.price, 0);
const PATIENT = '두드림';

/* ───────── (연습하기용) 미션 ───────── */
export const MISSION = {
  title: '종합병원 가정의학과 접수하기',
  steps: ['"접수하기"를 누르세요', '생년월일 6자리와 성별 1자리를 누르세요', '"가정의학과"를 고르세요', '접수증을 출력해 가져가세요'],
  checks: [
    { label: '접수하기 선택', test: (r) => r.type === 'reception' },
    { label: '가정의학과 선택', test: (r) => r.dept === '가정의학과' },
    { label: '접수증 받기', test: (r) => r.ticket },
  ],
};

/* ───────── 알아보기 순서 ───────── */
export const TOUR = [
  { sel: 'screen', title: '터치 화면', text: '큰 병원 입구에 있는 접수 · 수납 기계예요. 화면을 손가락으로 눌러서 사용해요.' },
  { sel: 'menu', title: '접수하기 · 수납', text: '진료 받기 전에는 "접수하기", 진료가 끝나고 돈을 내거나 처방전을 받을 때는 "수납·처방전"을 눌러요.' },
  { sel: 'info', title: '병원 안내', text: '입원 · 퇴원 안내, 병원 안내도(어디에 무슨 과가 있는지), 주차 안내를 볼 수 있어요.' },
  { sel: 'reader', title: '진료카드 리더기', text: '병원에서 받은 진료카드나 휴대폰 바코드를 비추면 번호를 누르지 않아도 돼요.' },
  { sel: 'card', title: '카드 넣는 곳', text: '진료비를 카드로 낼 때 카드를 꽂는 곳이에요.' },
  { sel: 'printer', title: '출력구', text: '접수증, 영수증, 처방전이 여기로 나와요. 처방전은 약국에 내요.' },
];

export default function GeneralHospital() {
  const { finish } = useExp();
  const [screen, setScreen] = useState('home'); // home | id | who | dept | done | printed | bill | card | printing | paid
  const [type, setType] = useState('');
  const [num, setNum] = useState('');
  const [dept, setDept] = useState(null);
  const [paper, setPaper] = useState(null);
  const [left, setLeft] = useState(5);
  const [notice, setNotice] = useState('');
  const [now] = useState(new Date());
  const timers = useRef([]);
  const result = useRef(null);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const card = useCardPay(() => {
    setScreen('printing');
    later(() => {
      beep(700, 0.5, 0.05);
      setPaper('bill');
      setScreen('paid');
      result.current = { type: 'payment', paid: true };
    }, 1800);
  });

  const go = (s) => {
    tap();
    setScreen(s);
  };
  const resetAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setScreen('home');
    setType('');
    setNum('');
    setDept(null);
    setLeft(5);
    card.reset();
    if (result.current) {
      finish(result.current);
      result.current = null;
    }
  };

  /* '5초 후 메인화면으로 이동합니다' */
  const countdown = screen === 'printed' || screen === 'paid';
  useEffect(() => {
    if (!countdown) return undefined;
    setLeft(5);
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);
  useEffect(() => {
    if (countdown && left <= 0) resetAll();
  }, [left, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = (k) => {
    tap();
    if (k === '지움') setNum((n) => n.slice(0, -1));
    else setNum((n) => (n.length < 7 ? n + k : n));
  };

  const printTicket = () => {
    tap();
    beep(700, 0.5, 0.05);
    setPaper('ticket');
    result.current = { type: 'reception', dept: dept.name, ticket: true };
    setScreen('printed');
  };

  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  const sub = {
    id: '환자정보 입력',
    who: '본인 확인',
    dept: '진료과목 선택',
    done: '접수완료',
    printed: '접수완료',
    bill: '진료비 확인',
    card: '카드 결제',
    printing: '출력',
    paid: '수납완료',
  }[screen];
  const head = type === 'reception' ? '접수하기' : '수납·처방전';

  /* ───────── 도우미 안내 ───────── */
  const guide = notice
    ? '안내창이에요. 읽고 "확인"을 눌러 주세요.'
    : {
        home: '큰 병원의 접수 기계예요. 진료를 받으러 왔으면 왼쪽 "접수하기", 진료가 끝났으면 오른쪽 "수납·처방전"을 누르세요.',
        id:
          num.length < 7
            ? '주민등록번호 앞 6자리(생년월일)와 뒷자리 첫 번째 숫자(성별)까지 7개를 누르세요. 체험이니 아무 숫자나 괜찮아요. 틀리면 "지움"을 누르세요.'
            : '다 누르셨어요. 아래 "확인"을 누르세요.',
        who: `화면의 이름이 내 이름이 맞는지 확인하는 거예요. 맞으면 "예"를 누르세요.`,
        dept: '진료 받을 과를 고르세요. 감기나 몸살, 어디로 가야 할지 모를 때는 "가정의학과"를 가면 돼요.',
        done: '접수가 끝났어요! 아래 "접수증 출력" 버튼을 눌러 접수증을 뽑으세요.',
        printed: `접수증이 나왔어요. 화면 아래 출력구에서 반짝이는 접수증을 눌러 챙기세요. ${left}초 뒤 처음 화면으로 돌아가요.`,
        bill: '오늘 낼 진료비예요. 금액을 확인하고 "카드 결제"를 누르세요.',
        card: {
          ready: '화면 아래 "카드 넣는 곳"에 반짝이는 카드를 눌러 꽂아 보세요.',
          processing: '결제 중이에요. 카드를 빼지 말고 기다려 주세요.',
          remove: '결제가 끝났어요! 카드를 눌러서 빼 주세요.',
          done: '',
          idle: '',
        }[card.st],
        printing: '영수증과 처방전을 뽑고 있어요. 잠시만 기다려 주세요.',
        paid: `영수증과 처방전이 나왔어요. 출력구에서 눌러 챙기세요. 처방전은 약국에 내면 약을 받을 수 있어요. ${left}초 뒤 처음 화면으로 돌아가요.`,
      }[screen];
  const on = useGuide(guide);
  const hl = (cond) => (on && cond ? ' hl' : '');

  const header = (
    <div className="gh-head">
      {screen !== 'home' && (
        <button
          className="gh-headbtn"
          onClick={() => {
            tap();
            const back = { id: 'home', who: 'id', dept: 'who', bill: 'who', done: 'dept' }[screen];
            if (back) setScreen(back);
          }}
        >
          <span>←</span>이전
        </button>
      )}
      <span className="gh-logo">
        <span className="gh-cross">✚</span>두드림 종합병원
      </span>
      {screen !== 'home' && (
        <button
          className="gh-headbtn right"
          onClick={() => {
            tap();
            resetAll();
          }}
        >
          <span>⌂</span>처음
        </button>
      )}
    </div>
  );

  const renderScreen = () => {
    if (screen === 'home') {
      return (
        <div className="gh-home">
          <h2 className="gh-hero">
            접수 · 수납
            <br />
            처방전 발행기
          </h2>
          <p className="gh-hint">
            원하시는 메뉴 버튼을 선택하세요. <span>👆</span>
          </p>
          <div className="gh-bigbtns" data-tour="menu">
            <button
              className={`gh-big${hl(true)}`}
              onClick={() => {
                setType('reception');
                setNum('');
                go('id');
              }}
            >
              <span className="gh-big-icon">🚪</span>
              접수
              <br />
              하기
            </button>
            <button
              className="gh-big"
              onClick={() => {
                setType('payment');
                setNum('');
                go('id');
              }}
            >
              <span className="gh-big-icon">🧾</span>
              수납 ·
              <br />
              처방전
            </button>
          </div>
          <p className="gh-welcome">어서 오세요. 무엇을 도와드릴까요?</p>
        </div>
      );
    }

    let body = null;
    if (screen === 'id') {
      body = (
        <div className="gh-frame">
          <p className="gh-frame-title">
            <b>진료카드번호</b> 또는
            <br />
            <b>주민등록번호</b>를 입력해주십시오.
          </p>
          <div className="gh-numbox">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={`gh-dot${num[i] ? ' on' : ''}`}>
                {num[i] || ''}
              </span>
            ))}
            <span className="gh-dash">-</span>
            <span className={`gh-dot${num[6] ? ' on' : ''}`}>{num[6] || ''}</span>
            <span className="gh-stars">******</span>
          </div>
          <div className="gh-keys">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '확인'].map((k) =>
              k === '확인' ? (
                <button
                  key={k}
                  className={`gh-key ok${hl(num.length === 7)}`}
                  disabled={num.length < 7}
                  onClick={() => go('who')}
                >
                  확인
                </button>
              ) : (
                <button key={k} className={`gh-key${k === '지움' ? ' fn' : ''}${on && num.length < 7 && k !== '지움' ? ' hl-soft' : ''}`} onClick={() => key(k)}>
                  {k}
                </button>
              )
            )}
          </div>
        </div>
      );
    } else if (screen === 'who') {
      body = (
        <div className="gh-frame center">
          <span className="gh-person">🧑‍🦳</span>
          <p className="gh-frame-title">
            <b className="gh-em">{PATIENT}</b> 님이 맞으십니까?
          </p>
          <p className="gh-small">
            생년월일 {num.slice(0, 2)}.{num.slice(2, 4)}.{num.slice(4, 6)}
          </p>
          <div className="gh-btnrow">
            <button className="gh-btn gray" onClick={() => go('id')}>
              아니오
            </button>
            <button className={`gh-btn${hl(true)}`} onClick={() => go(type === 'reception' ? 'dept' : 'bill')}>
              예
            </button>
          </div>
        </div>
      );
    } else if (screen === 'dept') {
      body = (
        <div className="gh-deptpage">
          <p className="gh-lead">
            <b>진료과목</b>을 선택해주세요.
          </p>
          <div className="gh-depts">
            {DEPTS.map((d) => (
              <button
                key={d.name}
                className={`gh-dept${hl(d.name === '가정의학과')}`}
                onClick={() => {
                  setDept(d);
                  go('done');
                }}
              >
                <span className="gh-dept-icon">{d.icon}</span>
                {d.name}
              </button>
            ))}
          </div>
        </div>
      );
    } else if (screen === 'done' || screen === 'printed') {
      const printed = screen === 'printed';
      body = (
        <div className="gh-sign">
          <div className="gh-board">
            <div className="gh-board-in">
              {printed ? (
                <>
                  <p className="gh-red">접수증이 출력되었습니다.</p>
                  <small>{left}초 후 메인화면으로 이동합니다.</small>
                </>
              ) : (
                <p>
                  <b>접수가 완료되었습니다.</b>
                  <br />
                  접수증 출력버튼을 누르세요.
                </p>
              )}
              <div className="gh-board-dept">{dept.name}</div>
              <div className="gh-board-info">
                <span>접수일: {dateStr}</span>
                <span>성&nbsp;&nbsp;&nbsp;명: {PATIENT}</span>
              </div>
            </div>
            <div className="gh-board-wait">대기인수: {dept.wait}명</div>
          </div>
          <div className="gh-posts">
            <span />
            <span />
          </div>
          <button className={`gh-print${hl(!printed)}`} disabled={printed} onClick={printTicket}>
            접수증 출력
          </button>
        </div>
      );
    } else if (screen === 'bill') {
      body = (
        <div className="gh-frame">
          <p className="gh-frame-title">
            <b>오늘 진료비</b>를 확인해주십시오.
          </p>
          <div className="gh-bill">
            {BILL.map((b) => (
              <div key={b.name}>
                <span>{b.name}</span>
                <b>{won(b.price)}</b>
              </div>
            ))}
            <div className="sum">
              <span>본인부담금</span>
              <b>{won(BILL_TOTAL)}</b>
            </div>
          </div>
          <p className="gh-small">처방전 1장이 함께 출력됩니다. (체험용 금액이에요)</p>
          <button
            className={`gh-btn wide${hl(true)}`}
            onClick={() => {
              go('card');
              card.start();
            }}
          >
            카드 결제
          </button>
        </div>
      );
    } else if (screen === 'card') {
      body = (
        <div className="gh-frame center">
          <p className="gh-small">결제 금액</p>
          <p className="gh-amount">{won(BILL_TOTAL)}</p>
          {card.st === 'processing' ? <div className="spinner teal" /> : <span className="gh-person">💳</span>}
          <p className="gh-frame-title">
            {card.st === 'ready' && '카드를 넣어주세요'}
            {card.st === 'processing' && '결제 중입니다'}
            {card.st === 'remove' && '카드를 빼주세요'}
          </p>
          {(card.st === 'ready' || card.st === 'remove') && <div className="arrow-down">▼ 아래 카드 넣는 곳 ▼</div>}
        </div>
      );
    } else if (screen === 'printing') {
      body = (
        <div className="gh-frame center">
          <div className="spinner teal" />
          <p className="gh-frame-title">영수증 · 처방전 출력 중입니다</p>
        </div>
      );
    } else if (screen === 'paid') {
      body = (
        <div className="gh-frame center">
          <div className="ok-circle">✓</div>
          <p className="gh-red">수납이 완료되었습니다.</p>
          <p className="gh-small">{left}초 후 메인화면으로 이동합니다.</p>
          <p className="gh-frame-title">
            영수증과 처방전을 챙기세요.
            <br />
            <small>처방전은 약국에 내시면 됩니다.</small>
          </p>
          <div className="arrow-down">▼ 아래 출력구 ▼</div>
        </div>
      );
    }

    return (
      <div className="gh-page">
        <div className="gh-title">
          <b>{head}</b>
          <span>{sub}</span>
        </div>
        {body}
      </div>
    );
  };

  return (
    <Scaler width={560} height={1240}>
      <div className="hp gh">
        <div className="hp-top">
          <div className="scr hp-screen gh-screen" data-tour="screen">
            {header}
            <div className="gh-content">{renderScreen()}</div>
            <div className="gh-info" data-tour="info">
              <button onClick={() => setNotice('입원 · 퇴원 수속은 1층 원무과 창구에서 도와드려요.')}>
                <span>🏥</span>입/퇴원안내
              </button>
              <button onClick={() => setNotice('본관 1층: 접수 · 수납, 2층: 내과, 3층: 외과 · 정형외과 (체험용 안내)')}>
                <span>🗺️</span>병원 안내도
              </button>
              <button onClick={() => setNotice('진료 받으신 분은 2시간 무료 주차예요. 주차권은 원무과에서 받으세요.')}>
                <span>🅿️</span>주차안내
              </button>
            </div>
            {notice && (
              <Modal>
                <p className="gh-modal-text">{notice}</p>
                <button
                  className={`gh-btn${hl(true)}`}
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
            <div className="hp-scanner" data-tour="reader">
              <div className="hp-scanner-win" />
              <span className="hw-label dark">진료카드 · 바코드</span>
            </div>
            <CardSlot st={card.st} onClick={card.clickCard} highlight={on} label="카드 넣는 곳" className="hp-card" />
          </div>
          <div className="hp-printer" data-tour="printer">
            <div className="hp-printer-area">
              {paper && (
                <button
                  className={`v-receipt big${hl(true)}`}
                  onClick={() => {
                    tap();
                    setPaper(null);
                  }}
                  aria-label="종이 가져가기"
                >
                  <b>두드림 종합병원</b>
                  {paper === 'ticket' ? (
                    <>
                      <span>접수증</span>
                      <span>{dept && dept.name}</span>
                      <span>대기 {dept && dept.wait}명</span>
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
          <div className="hp-sticker gh-sticker">두드림 종합병원</div>
        </div>
      </div>
    </Scaler>
  );
}
