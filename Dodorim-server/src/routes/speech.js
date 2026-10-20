import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { httpError, rateLimit, text } from '../util.js';
import { dir } from '../storage.js';

/*
 * 음성 안내 (Text-to-Speech): 글자를 읽어 주는 MP3를 만들어 돌려줍니다.
 * API 키는 서버의 .env(SPEECH_API_KEY)에만 두고 브라우저에는 절대 내려보내지 않습니다.
 * 현재 구현: Google Cloud Text-to-Speech v1 (REST, API 키 방식).
 * 다른 업체를 쓰려면 providers에 함수를 하나 추가하고 SPEECH_PROVIDER 값을 바꾸면 됩니다.
 * 같은 문장은 storage/tts-cache 에 저장해 두고 다시 쓰므로 API 비용이 반복해서 들지 않습니다.
 * 캐시는 SPEECH_CACHE_DAYS(기본 30일) 동안 한 번도 쓰이지 않은 파일을 하루에 한 번 지웁니다.
 * 유료 API 호출(캐시에 없는 문장)은 하루 SPEECH_DAILY_LIMIT(기본 2000회)까지. 넘으면 503 → 화면은 브라우저 내장 음성으로 읽음
 */
export const speechRouter = Router();

const {
  SPEECH_PROVIDER = 'google',
  SPEECH_API_KEY = '',
  SPEECH_LANGUAGE = 'ko-KR',
  SPEECH_VOICE = 'ko-KR-Standard-A',
  SPEECH_RATE = '0.9',
  SPEECH_DAILY_LIMIT = '2000',
  SPEECH_CACHE_DAYS = '30',
} = process.env;

const CACHE_DIR = dir('tts-cache');

// 하루 호출 수 (서버 시간 기준 날짜가 바뀌면 0부터). 서버를 다시 켜면 0부터 — 상한은 비용 폭주를 막는 안전장치 용도
let today = '';
let calls = 0;
function countCall() {
  const d = new Date().toDateString();
  if (d !== today) [today, calls] = [d, 0];
  if (calls >= Number(SPEECH_DAILY_LIMIT)) throw httpError(503, '오늘 음성 안내 사용량을 모두 썼습니다. 내일 다시 사용할 수 있습니다.');
  calls++;
}

// 오래 안 쓴 캐시 파일 정리 (쓸 때마다 파일 시간을 갱신하므로 자주 쓰는 문장은 남음)
export async function cleanTtsCache() {
  const cutoff = Date.now() - Number(SPEECH_CACHE_DAYS) * 86400_000;
  const names = await fs.readdir(CACHE_DIR).catch(() => []);
  for (const name of names) {
    const file = path.join(CACHE_DIR, name);
    const st = await fs.stat(file).catch(() => null);
    if (st && st.mtimeMs < cutoff) await fs.rm(file, { force: true });
  }
}
setInterval(() => cleanTtsCache().catch((e) => console.error('음성 캐시 정리 실패:', e.message)), 86400_000).unref();

const providers = {
  // 반환값: MP3 Buffer
  async google(input) {
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(SPEECH_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: input },
        voice: { languageCode: SPEECH_LANGUAGE, name: SPEECH_VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: Number(SPEECH_RATE) || 1 },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.audioContent) {
      console.error('Google TTS 오류:', r.status, data.error?.message);
      throw httpError(502, '음성 안내 서비스 호출에 실패했습니다.');
    }
    return Buffer.from(data.audioContent, 'base64');
  },
};

speechRouter.get('/status', (req, res) => res.json({ provider: SPEECH_PROVIDER, enabled: Boolean(SPEECH_API_KEY) }));

// { text } -> audio/mpeg
speechRouter.post('/tts', rateLimit(30, 60_000), async (req, res) => {
  if (!SPEECH_API_KEY) throw httpError(503, '음성 안내가 설정되지 않았습니다. 서버 .env에 SPEECH_API_KEY를 입력해 주세요.');
  const provider = providers[SPEECH_PROVIDER];
  if (!provider) throw httpError(500, `알 수 없는 SPEECH_PROVIDER: ${SPEECH_PROVIDER}`);
  const input = text(req.body?.text, '읽을 글', { max: 1000, required: true });

  const key = crypto.createHash('sha256').update([SPEECH_PROVIDER, SPEECH_VOICE, SPEECH_RATE, input].join('|')).digest('hex');
  const cached = path.join(CACHE_DIR, `${key}.mp3`);
  let audio = await fs.readFile(cached).catch(() => null);
  if (audio) {
    const now = new Date();
    await fs.utimes(cached, now, now).catch(() => {}); // 최근에 쓴 문장은 정리 대상에서 빠짐
  } else {
    countCall();
    audio = await provider(input);
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cached, audio);
  }
  res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' }).send(audio);
});
