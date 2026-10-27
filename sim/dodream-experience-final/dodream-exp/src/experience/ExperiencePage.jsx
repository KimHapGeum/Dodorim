import { useEffect, useRef, useState } from 'react';
import './experience.css';
import { GuideProvider } from './guide/GuideContext';
import GuidePanel from './guide/GuidePanel';
import TourOverlay from './guide/TourOverlay';
import FastFoodKiosk, { MISSION as K_MISSION, TOUR as K_TOUR } from './kiosk/FastFoodKiosk';
import TableOrder, { MISSION as T_MISSION, TOUR as T_TOUR } from './table/TableOrder';
import CivilIssuer, { MISSION as C_MISSION, TOUR as C_TOUR } from './civil/CivilIssuer';
import SelfCheckout, { MISSION as S_MISSION, TOUR as S_TOUR } from './selfcheckout/SelfCheckout';
import HospitalKiosk, { MISSION as H_MISSION, TOUR as H_TOUR } from './hospital/HospitalKiosk';
import GeneralHospital, { MISSION as G_MISSION, TOUR as G_TOUR } from './hospital/GeneralHospital';
import { MonitorIcon, BarcodeIcon, HospitalIcon, PublicIcon, DiningIcon, GeneralHospitalIcon } from './shared/Icons';

const MENU = [
  {
    id: 'kiosk',
    title: '키오스크',
    desc: '식당과 카페에서 당당하게!\n주문하는 방법을 연습해요.',
    icon: '🍔',
    Icon: MonitorIcon,
    color: 'blue',
    Comp: FastFoodKiosk,
    mission: K_MISSION,
    tour: K_TOUR,
  },
  {
    id: 'table',
    title: '테이블형 키오스크',
    desc: '메뉴 선택부터 결제까지!\n식탁 위 태블릿으로 주문해요.',
    icon: '🍽️',
    Icon: DiningIcon,
    color: 'pink',
    Comp: TableOrder,
    mission: T_MISSION,
    tour: T_TOUR,
  },
  {
    id: 'civil',
    title: '무인민원발급기',
    desc: '주민등록등본 등 각종 서류를\n무인발급기에서 뽑아 봐요.',
    icon: '📄',
    Icon: PublicIcon,
    color: 'purple',
    Comp: CivilIssuer,
    mission: C_MISSION,
    tour: C_TOUR,
  },
  {
    id: 'self',
    title: '셀프 계산대',
    desc: '마트나 편의점에서 직접\n바코드를 찍고 결제해 봐요.',
    icon: '🛒',
    Icon: BarcodeIcon,
    color: 'teal',
    Comp: SelfCheckout,
    mission: S_MISSION,
    tour: S_TOUR,
  },
  {
    id: 'hospital',
    title: '병원',
    desc: '접수부터 수납, 처방전 발행까지\n병원 업무를 연습해요.',
    icon: '🏥',
    Icon: HospitalIcon,
    color: 'cyan',
    Comp: HospitalKiosk,
    mission: H_MISSION,
    tour: H_TOUR,
  },
  {
    id: 'general',
    title: '종합병원',
    desc: '큰 병원 기계로 접수하고,\n진료비 수납 · 처방전을 뽑아 봐요.',
    icon: '🏨',
    Icon: GeneralHospitalIcon,
    color: 'cyan',
    Comp: GeneralHospital,
    mission: G_MISSION,
    tour: G_TOUR,
  },
];

// 체험 화면 위쪽의 방법 바꾸기 탭
const MODES = [
  {
    id: 'learn',
    icon: '🔍',
    title: '알아보기',
    desc: '기계의 생김새와 각 부분이 하는 일을 차례로 알아봐요.',
  },
  {
    id: 'free',
    icon: '🙌',
    title: '자유롭게 해보기',
    desc: '직접 눌러 보며 해 봐요. 막히면 힌트를 볼 수 있어요.',
  },
];

/**
 * 체험하기 페이지
 * - <Route path="/experience" element={<ExperiencePage />} />
 * - initial="civil" 처럼 특정 체험을 바로 열 수 있어요. (kiosk, table, civil, self, hospital, general)
 * - onHome 을 넘기면 첫 화면 왼쪽 위에 '홈으로' 버튼이 생겨요.
 */
export default function ExperiencePage({ initial = null, onHome }) {
  const [sel, setSel] = useState(initial);
  const [mode, setMode] = useState(initial ? 'free' : null);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState(null);
  const stageRef = useRef(null);
  const item = MENU.find((m) => m.id === sel);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sel, mode]);

  const restart = () => {
    setResult(null);
    setRunKey((k) => k + 1);
  };
  const changeMode = (m) => {
    setResult(null);
    setMode(m);
    setRunKey((k) => k + 1);
  };
  const onFinish = (r) => {
    if (mode === 'practice') {
      const checks = item.mission.checks.map((c) => ({ label: c.label, ok: !!c.test(r) }));
      setResult({ checks, ok: checks.every((c) => c.ok) });
    } else if (mode === 'free') {
      setResult({ free: true, ok: true });
    }
  };

  /* ───── 1. 체험 고르기 (세로 직사각형 패널) ───── */
  if (!item) {
    return (
      <div className="dd-exp">
        <div className="lobby">
          <div className="lobby-panel">
            <header className="lobby-head">
              {onHome && (
                <button className="lobby-home" onClick={onHome}>
                  ← 홈으로
                </button>
              )}
              <p className="lobby-brand">
                <span className="lobby-mark" aria-hidden="true">
                  D
                </span>
                두드림
              </p>
              <h1 className="lobby-title">스마트기기 체험관</h1>
              <p className="lobby-sub">어떤 체험을 해 보시겠어요?</p>
            </header>
            <div className="lobby-list">
              {MENU.map((m) => {
                const Icon = m.Icon;
                return (
                  <button
                    key={m.id}
                    className="lobby-card"
                    onClick={() => {
                      setSel(m.id);
                      setMode('free');
                      setResult(null);
                      setRunKey((k) => k + 1);
                    }}
                  >
                    <span className="lobby-icon-box">
                      <Icon className="lobby-icon" />
                    </span>
                    <span className="lobby-card-body">
                      <span className="lobby-card-title">
                        {m.title}
                        {m.sub && <span className="lobby-card-sub">{m.sub}</span>}
                      </span>
                      <span className="lobby-card-desc">{m.desc}</span>
                    </span>
                    <span className="lobby-arrow" aria-hidden="true">
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
            <footer className="lobby-foot">실제로 돈이 나가지 않는 체험용 화면이에요</footer>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 3. 체험하기 ───── */
  const Comp = item.Comp;
  return (
    <div className="dd-exp">
      <GuideProvider key={`${sel}-${mode}-${runKey}`} mode={mode} onFinish={onFinish}>
        <div className="run">
          <header className="run-head">
            <button
              className="run-back"
              onClick={() => {
                setSel(null);
                setMode(null);
                setResult(null);
              }}
            >
              ← 체험 목록
            </button>
            <h1 className="run-title">
              {item.sub || item.title}
            </h1>
            <div className="run-modes" role="tablist" aria-label="체험 방법">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={mode === m.id}
                  className={`run-mode${mode === m.id ? ' on' : ''}`}
                  onClick={() => changeMode(m.id)}
                >
                  {m.title}
                </button>
              ))}
            </div>
          </header>
          <div className="run-body">
            <div className={`run-stage${mode === 'learn' ? ' learning' : ''}`} ref={stageRef}>
              <Comp />
              {mode === 'learn' && <TourOverlay steps={item.tour} stageRef={stageRef} />}
              {result && (
                <div className="result">
                  <div className={`result-box${result.ok ? ' ok' : ''}`}>
                    <div className="result-icon">{result.ok ? '🎉' : '💪'}</div>
                    <h2 className="result-title">
                      {result.free ? '끝까지 해내셨어요!' : result.ok ? '미션 성공!' : '조금만 더 해 볼까요?'}
                    </h2>
                    {result.checks && (
                      <ul className="result-list">
                        {result.checks.map((c) => (
                          <li key={c.label} className={c.ok ? 'ok' : 'no'}>
                            <span>{c.ok ? '✔' : '✘'}</span>
                            {c.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!result.ok && <p className="result-sub">✘ 표시된 부분을 생각하며 다시 해 보세요.</p>}
                    <div className="result-btns">
                      <button className="result-btn" onClick={restart}>
                        ↺ 다시 하기
                      </button>
                      {(mode === 'free' || !result.ok) && (
                        <button className="result-btn main" onClick={() => setSel(null)}>
                          다른 기계 체험하기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <GuidePanel mission={item.mission} onRestart={restart} onMode={changeMode} />
          </div>
        </div>
      </GuideProvider>
    </div>
  );
}
