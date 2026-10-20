import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { httpError } from './util.js';

/*
 * 파일 저장소 구조 (STORAGE_DIR, Docker에서는 /data/storage)
 *   posts/<게시글ID>/<슬라이드번호>/text.txt  슬라이드 글
 *   posts/<게시글ID>/<슬라이드번호>/*.jpg|mp4 슬라이드 사진·영상
 *   notices/<공지ID>/content.txt            공지 본문
 *   notices/<공지ID>/*                       공지 첨부파일
 *   banners/<배너ID>/*                       배너 이미지
 *   categories/<분류ID>/*                    단원 아이콘
 *   tmp/                                     업로드 임시 폴더
 *   trash/                                   지우는 중인 폴더 (removeWithDb). 서버 시작 때 비움
 *   tts-cache/                               음성 안내 MP3 캐시 (routes/speech.js)
 */
export const ROOT = path.resolve(process.env.STORAGE_DIR || 'storage');
export const SLIDE_TEXT = 'text.txt';
export const NOTICE_TEXT = 'content.txt';
const RESERVED = new Set([SLIDE_TEXT, NOTICE_TEXT]);

// 모든 경로 조각은 숫자 ID 또는 safeName()을 거친 파일명이라 ROOT 밖으로 나갈 수 없음
export const dir = (...parts) => path.join(ROOT, ...parts.map(String));
export const fileUrl = (...parts) => '/files/' + parts.map((p) => encodeURIComponent(p)).join('/');

const IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const VIDEO = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];
const DOCS = ['.pdf', '.hwp', '.hwpx', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip'];
export const KINDS = { image: IMAGE, media: [...IMAGE, ...VIDEO], attachment: [...IMAGE, ...VIDEO, ...DOCS] };

export const mediaType = (name) => (VIDEO.includes(path.extname(name).toLowerCase()) ? 'video' : IMAGE.includes(path.extname(name).toLowerCase()) ? 'image' : 'file');

// 업로드 파일명 정리: multer가 latin1로 넘기는 한글 이름 복원, 경로/금지 문자 제거
export function safeName(original) {
  const name = path.basename(Buffer.from(original, 'latin1').toString('utf8'))
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+/, '_').slice(-120);
  return name || 'file';
}

// URL로 받은 파일명 검증 (경로 이동·숨김 파일·글 파일 삭제 방지)
export function safeFileParam(name) {
  if (typeof name !== 'string' || !name || name.startsWith('.') || /[\\/:*?"<>|\x00-\x1f]/.test(name) || RESERVED.has(name)) {
    throw httpError(400, '파일 이름이 올바르지 않습니다.');
  }
  return name;
}

const exists = (p) => fs.access(p).then(() => true, () => false);

// 임시 폴더에 받은 업로드 파일을 대상 폴더로 옮기고 최종 파일명을 돌려줌 (같은 이름이 있으면 번호를 붙임)
export async function moveInto(file, destDir, fixedName) {
  await fs.mkdir(destDir, { recursive: true });
  let name = fixedName || safeName(file.originalname);
  if (RESERVED.has(name)) name = `_${name}`;
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let i = 2; !fixedName && (await exists(path.join(destDir, name))); i++) name = `${base}(${i})${ext}`;
  await fs.rename(file.path, path.join(destDir, name));
  return name;
}

export async function readText(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return '';
    throw e;
  }
}

// 폴더 안 파일 목록 (글 파일 제외, 이름순). 폴더가 없으면 빈 배열
export async function listFiles(d) {
  try {
    const entries = await fs.readdir(d, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && !RESERVED.has(e.name)).map((e) => e.name).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

// 숫자 이름의 하위 폴더(슬라이드 번호) 목록, 오름차순
export async function listSlideNos(postDir) {
  try {
    const entries = await fs.readdir(postDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && /^\d+$/.test(e.name)).map((e) => Number(e.name)).sort((a, b) => a - b);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

export const removePath = (p) => fs.rm(p, { recursive: true, force: true });

/*
 * DB 행과 그 파일 폴더를 함께 지울 때: 폴더를 먼저 trash/로 옮기고 → DB를 지우고 → trash를 비움.
 * DB 삭제가 실패하면(예: 강의가 남은 단원) 폴더를 제자리로 되돌려서 DB와 파일이 어긋나지 않음.
 * trash를 비우다 실패하거나 서버가 꺼지면 남은 것은 다음 서버 시작 때 비움(index.js)
 */
export async function removeWithDb(dirs, dbDelete) {
  const moved = [];
  const restore = async () => { for (const [from, to] of moved.reverse()) await fs.rename(to, from); };
  for (const d of dirs) {
    const to = path.join(ROOT, 'trash', `${path.relative(ROOT, d).replace(/[\\/]/g, '-')}-${Date.now()}`);
    try {
      await fs.rename(d, to);
      moved.push([d, to]);
    } catch (e) {
      if (e.code === 'ENOENT') continue; // 파일이 없던 항목
      await restore();
      throw e;
    }
  }
  try {
    await dbDelete();
  } catch (e) {
    await restore();
    throw e;
  }
  for (const [, to] of moved) await removePath(to).catch((e) => console.error('지운 파일 정리 실패 (서버를 다시 켜면 정리됨):', e.message));
}

// 파일 1개 최대 용량(MB). 사진만 받는 곳(배너·단원 아이콘)은 작게, 영상·첨부가 오는 곳은 크게
export const MAX_MB = { image: Number(process.env.MAX_IMAGE_MB || 20), media: Number(process.env.MAX_UPLOAD_MB || 500), attachment: Number(process.env.MAX_UPLOAD_MB || 500) };

// 업로드 미들웨어: 확장자 허용 목록 검사 후 tmp/ 에 저장. 처리 후 남은 임시 파일은 index.js에서 정리
export function upload(kind, maxMb = MAX_MB[kind]) {
  const m = multer({
    dest: dir('tmp'),
    limits: { fileSize: maxMb * 1024 * 1024, files: 30 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(safeName(file.originalname)).toLowerCase();
      if (KINDS[kind].includes(ext)) cb(null, true);
      else cb(httpError(400, `허용되지 않는 파일 형식입니다: ${ext || '(확장자 없음)'}`));
    },
  });
  // 용량을 넘으면 한도를 알려 주도록 multer 오류를 바꿔 줌
  const wrap = (mw) => (req, res, next) => mw(req, res, (err) => next(err?.code === 'LIMIT_FILE_SIZE' ? httpError(400, `파일 용량이 너무 큽니다. (한 파일 최대 ${maxMb}MB)`) : err));
  return { single: (field) => wrap(m.single(field)), array: (field) => wrap(m.array(field)), none: () => wrap(m.none()) };
}
