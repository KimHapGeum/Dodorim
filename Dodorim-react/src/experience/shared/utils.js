// 금액 표시: 12000 -> "12,000원"
export const won = (n) => n.toLocaleString('ko-KR') + '원';

// 효과음 (실제 기계처럼 '삑' 소리). 브라우저가 소리를 막아도 오류 없이 넘어갑니다.
let audioCtx = null;
export function beep(freq = 1200, dur = 0.12, vol = 0.12) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch (e) {
    /* 소리 재생 불가 환경은 무시 */
  }
}

// 버튼 누를 때 짧은 '톡' 소리
export const tap = () => beep(880, 0.05, 0.05);
