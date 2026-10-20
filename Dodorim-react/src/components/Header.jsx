import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearToken } from '../api';
import { setVoiceEnabled, useVoiceEnabled } from '../voice';
import '../styles/header.css';
import { confirm } from '../dialog';
import { clickable } from '../a11y';

// type: 'manager' | 'screen' | 'edu' | 'hidden' | undefined(메인: 관리자 로그인 버튼)
export default function Header({ type, onFontSize }) {
  const navigate = useNavigate();
  const [fontReady, setFontReady] = useState(false);
  const voiceOn = useVoiceEnabled();

  useEffect(() => {
    document.fonts.load('42px "Black Han Sans"').finally(() => setFontReady(true));
  }, []);

  const voice = (
    <div className="voice-control" {...clickable(() => setVoiceEnabled(!voiceOn))} aria-pressed={voiceOn}>
      <div className="voice-label">{voiceOn ? '음성 안내 켜짐' : '음성 안내 꺼짐'}</div>
      <div className={`voice-btn ${voiceOn ? 'voice-on' : 'voice-off'}`}>
        <i className={`fa-solid ${voiceOn ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
      </div>
    </div>
  );

  let buttons = null;
  if (type === 'manager') {
    buttons = (
      <button className="logout-btn" onClick={async () => { if (await confirm('로그아웃 하시겠습니까?')) { clearToken(); navigate('/'); } }}>
        <i className="fa-solid fa-arrow-right-from-bracket"></i> 로그아웃
      </button>
    );
  } else if (type === 'screen') {
    buttons = (
      <>
        <div className="font-control-group" aria-label="설명 글자 크기 조절">
          <button className="font-control-button" onClick={() => onFontSize?.(2)} aria-label="글자 크게">
            <i className="fa-solid fa-magnifying-glass-plus"></i><span className="font-control-label">글자 크게</span>
          </button>
          <button className="font-control-button" onClick={() => onFontSize?.(-2)} aria-label="글자 작게">
            <i className="fa-solid fa-magnifying-glass-minus"></i><span className="font-control-label">글자 작게</span>
          </button>
        </div>
        {voice}
      </>
    );
  } else if (type === 'edu') {
    buttons = voice;
  } else if (type !== 'hidden') {
    buttons = <button className="login-btn" onClick={() => navigate('/login')}>관리자 로그인</button>;
  }

  return (
    <div className="dd-header">
      <div className="header-inner">
        <Link to="/" className="main-logo-top">
          <span className={`logo-text ${fontReady ? 'font-ready' : ''}`}>두드림</span>
        </Link>
        <div id="btn-area">{buttons}</div>
      </div>
    </div>
  );
}
