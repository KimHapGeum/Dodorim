import { useEffect, useSyncExternalStore } from 'react';

/*
 * 음성 안내 (Text-to-Speech)
 * - 서버 /api/speech/tts 가 만든 MP3를 재생합니다. 서버에 API 키가 없으면 브라우저 내장 음성으로 대신 읽습니다.
 * - 켜짐/꺼짐 상태는 모든 페이지가 공유하고, 다음 방문 때도 기억합니다.
 */
const KEY = 'dodorim_voice';
let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();
let currentText = '';
let audio = null;
let serverTts = true; // 서버 TTS가 꺼져 있으면(503) 이후엔 브라우저 음성만 사용
const listeners = new Set();

export function stopVoice() {
  audio?.pause();
  audio = null;
  window.speechSynthesis?.cancel();
}

function browserSpeak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// force: 체험하기처럼 화면에 따로 '소리 켜기'가 있으면 전체 음성 설정과 상관없이 바로 읽음
export async function speak(text, force = false) {
  stopVoice();
  if (force) currentText = text;
  const on = () => enabled || force;
  if (!on() || !text) return;
  if (serverTts) {
    try {
      const res = await fetch('/api/speech/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (res.status === 503) serverTts = false;
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        if (text !== currentText || !on()) return; // 기다리는 사이 페이지가 바뀜
        audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        // 사용자가 화면을 한 번도 누르지 않았으면 브라우저가 자동 재생을 막을 수 있음
        await audio.play().catch(() => {});
        return;
      }
    } catch {
      // 서버 연결 실패 시 브라우저 음성으로
    }
  }
  if (text === currentText && on()) browserSpeak(text);
}

export function setVoiceEnabled(on) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* 저장 실패해도 동작 */ }
  listeners.forEach((l) => l());
  if (on) speak(currentText);
  else stopVoice();
}

export const useVoiceEnabled = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => enabled);

// 페이지(또는 슬라이드)의 안내 문구를 등록하고 읽어 줌. 페이지를 떠나면 멈춤
export function useVoiceGuide(text) {
  useEffect(() => {
    currentText = text;
    speak(text);
    return () => {
      if (currentText === text) currentText = '';
      stopVoice();
    };
  }, [text]);
}
