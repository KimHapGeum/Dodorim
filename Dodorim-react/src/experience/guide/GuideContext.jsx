import { createContext, useContext, useEffect, useState } from 'react';
import { speak as voiceSpeak } from '../../voice';

/**
 * 체험 공통 상태
 * - mode: 'learn'(알아보기) | 'practice'(연습하기) | 'free'(자유롭게 해보기)
 * - text: 지금 단계에서 해야 할 일 (도우미 안내 문장)
 * - highlight: 눌러야 할 곳 반짝이기
 * - voice: 안내 문장을 소리로 읽기
 * - hint: 자유 모드에서 '힌트 보기'를 눌렀는지
 */
const Ctx = createContext(null);

// 프로젝트 공통 음성(서버 TTS, 안 되면 브라우저 음성)으로 읽음
export const speak = (text) => voiceSpeak(text, true);
export const stopSpeak = () => voiceSpeak('', true); // 읽을 글을 비워서 서버 응답을 기다리던 음성도 취소

// highlight·voice 켜기/끄기는 부모(ExperiencePage)가 들고 있어서 '처음으로 다시'로 새로 시작해도 그대로 유지돼요
export function GuideProvider({ mode = 'practice', onFinish, highlight, setHighlight, voice, setVoice, children }) {
  const [text, setText] = useState('');
  const [hint, setHint] = useState(false);
  const [tourNav, setTourNav] = useState(null);

  // 자유 모드의 힌트는 한 단계에서만 보여주고, 다음 단계로 가면 다시 숨겨요
  useEffect(() => {
    setHint(false);
  }, [text]);

  const visibleText = mode === 'free' && !hint ? '' : text;
  useEffect(() => {
    if (voice && visibleText) speak(visibleText);
    else stopSpeak(); // 소리 끄기를 누르면 읽던 것도 멈춤
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
