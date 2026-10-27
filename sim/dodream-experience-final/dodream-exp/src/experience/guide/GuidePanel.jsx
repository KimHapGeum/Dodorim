import { useState } from 'react';
import { useGuideState } from './GuideContext';

const MODE_LABEL = { learn: '알아보기', practice: '연습하기', free: '자유롭게 해보기' };
// (연습하기 화면은 지금 쓰지 않지만, 다시 켤 수 있도록 남겨 두었어요)

// 체험 화면 옆(휴대폰에서는 위)에 보이는 '도우미'
export default function GuidePanel({ mission, onRestart, onMode }) {
  const g = useGuideState();
  const { mode, voice, setVoice, highlight, setHighlight } = g;
  // 작은 화면에서는 미션 목록을 접어 두어 기계가 가려지지 않게 해요
  const [missionOpen, setMissionOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1100);

  return (
    <aside className={`guide guide-${mode}`} aria-live="polite">
      <div className="guide-head">
        <span className="guide-mode">{MODE_LABEL[mode]}</span>
        <span className="guide-title">도우미 안내</span>
      </div>

      {mode === 'learn' && g.tourNav && (
        <>
          <div className="guide-step-count">
            {g.tourNav.idx + 1} / {g.tourNav.total}
          </div>
          <h3 className="guide-tour-title">{g.tourNav.title}</h3>
          <p className="guide-text">{g.text}</p>
          <div className="guide-nav">
            <button className="guide-btn" onClick={g.tourNav.prev} disabled={g.tourNav.idx === 0}>
              ◀ 이전
            </button>
            {g.tourNav.idx < g.tourNav.total - 1 ? (
              <button className="guide-btn main" onClick={g.tourNav.next}>
                다음 ▶
              </button>
            ) : (
              <button className="guide-btn main" onClick={() => onMode('free')}>
                직접 해보기 ▶
              </button>
            )}
          </div>
        </>
      )}

      {mode === 'practice' && (
        <>
          {mission && (
            <div className="mission">
              <button className="mission-toggle" onClick={() => setMissionOpen(!missionOpen)} aria-expanded={missionOpen}>
                <span className="mission-head">🎯 오늘의 미션</span>
                <span className="mission-more">{missionOpen ? '접기 ▲' : '펼치기 ▼'}</span>
              </button>
              <p className="mission-title">{mission.title}</p>
              {missionOpen && (
                <ol className="mission-steps">
                  {mission.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <p className="guide-text">{g.text || '화면을 눌러 시작해 보세요.'}</p>
        </>
      )}

      {mode === 'free' && (
        <>
          <p className="guide-text">
            {g.hint && g.text ? g.text : '실제 기계처럼 자유롭게 눌러 보세요. 무엇을 눌러야 할지 모르겠으면 아래 "힌트 보기"를 누르세요. 눌러야 할 곳이 반짝여요.'}
          </p>
          <button className={`guide-hint${g.hint ? ' on' : ''}`} onClick={() => g.setHint(!g.hint)}>
            💡 {g.hint ? '힌트 숨기기' : '힌트 보기'}
          </button>
        </>
      )}

      <div className="guide-tools">
        {mode === 'practice' && (
          <button className={`guide-toggle${highlight ? ' on' : ''}`} onClick={() => setHighlight(!highlight)}>
            <span>✨ 누를 곳 반짝이기</span>
            <b>{highlight ? '켜짐' : '꺼짐'}</b>
          </button>
        )}
        <button className={`guide-toggle${voice ? ' on' : ''}`} onClick={() => setVoice(!voice)}>
          <span>🔊 소리로 안내 듣기</span>
          <b>{voice ? '켜짐' : '꺼짐'}</b>
        </button>
        <button className="guide-restart" onClick={onRestart}>
          ↺ 처음부터 다시
        </button>
      </div>
      <p className="guide-note">체험용 화면이에요. 실제로 돈이 나가지 않으니 마음껏 눌러 보세요!</p>
    </aside>
  );
}
