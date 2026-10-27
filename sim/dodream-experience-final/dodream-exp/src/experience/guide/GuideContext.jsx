import { createContext, useContext, useEffect, useState } from 'react';

/**
 * 체험 공통 상태
 * - mode: 'learn'(알아보기) | 'practice'(연습하기) | 'free'(자유롭게 해보기)
 * - text: 지금 단계에서 해야 할 일 (도우미 안내 문장)
 * - highlight: 눌러야 할 곳 반짝이기
 * - voice: 안내 문장을 소리로 읽기
 * - hint: 자유 모드에서 '힌트 보기'를 눌렀는지
 */
const Ctx = createContext(null);

export function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
export function stopSpeak() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function GuideProvider({ mode = 'practice', onFinish, children }) {
  const [text, setText] = useState('');
  const [highlight, setHighlight] = useState(true);
  const [voice, setVoice] = useState(false);
  const [hint, setHint] = useState(false);
  const [tourNav, setTourNav] = useState(null);

  // 자유 모드의 힌트는 한 단계에서만 보여주고, 다음 단계로 가면 다시 숨겨요
  useEffect(() => {
    setHint(false);
  }, [text]);

  const visibleText = mode === 'free' && !hint ? '' : text;
  useEffect(() => {
    if (voice && visibleText) speak(visibleText);
  }, [visibleText, voice]);
  useEffect(() => () => stopSpeak(), []);

  const value = {
    mode,
    text,
    setText,
    visibleText,
    highlight,
    setHighlight,
    voice,
    setVoice,
    hint,
    setHint,
    tourNav,
    setTourNav,
    finish: onFinish,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGuideState() {
  return useContext(Ctx);
}

/**
 * 각 체험 화면에서 호출: 현재 단계 안내 문장을 등록하고,
 * 지금 '누를 곳 반짝이기'를 보여줘야 하는지 돌려줍니다.
 */
export function useGuide(text) {
  const ctx = useContext(Ctx);
  const { mode, setText } = ctx;
  useEffect(() => {
    if (mode !== 'learn') setText(text);
  }, [text, mode, setText]);
  if (mode === 'learn') return false;
  if (mode === 'free') return ctx.hint; // 자유 모드: '힌트 보기'를 누르면 누를 곳이 반짝여요
  return ctx.highlight;
}

/** 체험 모드 정보와 '끝까지 마쳤어요' 알림 */
export function useExp() {
  const ctx = useContext(Ctx);
  return {
    mode: ctx.mode,
    demo: ctx.mode === 'learn',
    finish: (result) => {
      if (ctx.finish) ctx.finish(result);
    },
  };
}
