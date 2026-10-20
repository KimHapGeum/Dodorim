import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import useTimers from '../useTimers';
import { api } from '../api';
import { useVoiceGuide } from '../voice';
import PagedGrid from './PagedGrid';
import { descStyle, findCategory, flat, useCategoryTree } from '../categories';
import { SUB_LOOK, mainRoute } from '../data/places';
import { alert } from '../dialog';
import { clickable } from '../a11y';

/*
 * 병원/공공시설/음식점/대형매장/무인매장/휴대폰/ATM(+ 새로 만든 중단원) 소단원 선택 화면 공통 템플릿.
 * mid: 중단원 id 또는 이름 경로(['키오스크', '병원']). 소단원 목록은 DB에서 읽고, 그림은 등록한 아이콘 > 기본 그림 순
 * 카드를 누르면 그 소단원에 등록된 강의 목록(/screen_list)으로 이동합니다.
 */
export default function PlaceSelect({
  stepIndicator, title, subtitle, containerClass, mid, backTo,
  delay = (i) => i * 0.1 + 0.1, submitLabel = '확인', maxLength = 500,
}) {
  const navigate = useNavigate();
  const later = useTimers();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const tree = useCategoryTree();
  const node = tree && findCategory(tree, mid);
  const subs = node?.children || [];
  const parent = node && flat(tree).find((c) => c.id === node.parentId);
  useVoiceGuide(`${title} ${subtitle}`);

  // 닫을 때 입력 내용 초기화
  const closeSuggestion = () => { setOpen(false); setText(''); };

  const openSuggestion = () => {
    setOpen(true);
    later(() => textareaRef.current?.focus(), 100);
  };

  const submitSuggestion = async () => {
    const value = text.trim();
    if (value === '') {
      await alert('건의하실 내용을 입력해주세요.');
      textareaRef.current.focus();
      return;
    }
    // 서버가 같은 IP에서 1분에 1번만 받음. 막히면 남은 시간을 알려 주고, 쓴 내용은 그대로 둠
    setSending(true);
    try {
      await api('/suggestions', { method: 'POST', body: { content: value } });
    } catch (e) {
      alert(e.message);
      return;
    } finally {
      setSending(false);
    }
    alert('건의해주셔서 감사합니다.');
    closeSuggestion();
  };

  // ESC 키로 팝업 닫기
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeSuggestion();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div id="main-header-wrapper">
        <Header type="edu" />
      </div>

      <main className="main-content">
        {stepIndicator && <div className="step-indicator">{stepIndicator}</div>}

        <div className="title-group">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <PagedGrid
          className={containerClass}
          id="kiosk-list"
          items={subs}
          loaded={!!tree}
          render={(c, index) => {
            const img = c.iconUrl || SUB_LOOK[c.name]?.img;
            const desc = c.description || SUB_LOOK[c.name]?.desc;
            return (
              <div key={c.id} className="card" style={{ animationDelay: `${delay(index)}s` }} {...clickable(() => navigate(`/screen_list?id=${c.id}`))}>
                <div className="img-box">
                  {img ? <img className={c.iconUrl ? 'unit-photo' : undefined} src={img} alt={c.name} /> : <i className="fa-solid fa-location-dot" style={{ fontSize: '60px', color: '#94a3b8' }}></i>}
                </div>
                <h2 title={c.name}>{c.name}</h2>
                <p style={descStyle}>{desc}</p>
              </div>
            );
          }}
        />

        <div className="bottom-buttons">
          <button className="btn-back-bottom" onClick={() => navigate(backTo || (parent ? mainRoute(parent) : '/select_topic'))}>
            <i className="fa-solid fa-arrow-left"></i> 이전 화면으로 가기
          </button>
          <button className="btn-suggestion" onClick={openSuggestion}>
            <i className="fa-regular fa-comment-dots"></i> 건의하기
          </button>
        </div>
      </main>

      {/* 건의하기 팝업 (바깥쪽 클릭 시 닫기) */}
      <div className={`suggestion-modal ${open ? 'show' : ''}`} onClick={(e) => e.target === e.currentTarget && closeSuggestion()}>
        <div className="suggestion-box" role="dialog" aria-modal="true" aria-labelledby="suggestionTitle">
          <div className="suggestion-title">
            <h2 id="suggestionTitle">건의하기</h2>
            <i className="fa-regular fa-comment-dots"></i>
          </div>

          <p className="suggestion-description">두드림에 바라는 점이나 불편한 점을 자유롭게 작성해주세요.</p>

          <textarea
            ref={textareaRef}
            className="suggestion-textarea"
            maxLength={maxLength}
            placeholder="건의하실 내용을 입력해주세요."
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>

          <div className="suggestion-actions">
            <button type="button" className="modal-btn btn-cancel" onClick={closeSuggestion}>취소</button>
            <button type="button" className="modal-btn btn-submit" onClick={submitSuggestion} disabled={sending}>{sending ? '보내는 중...' : submitLabel}</button>
          </div>
        </div>
      </div>

      <footer>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</footer>
    </>
  );
}
