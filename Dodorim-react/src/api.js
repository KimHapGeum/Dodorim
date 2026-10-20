// 백엔드(Dodorim-server) API 호출. 관리자 토큰은 localStorage에 보관합니다.
const TOKEN_KEY = 'dodorim_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// fetch는 업로드 진행률을 알 수 없어서, 진행률이 필요하면 XMLHttpRequest로 보내고 fetch와 같은 Response로 돌려줌
function sendWithProgress(url, { method, headers, body }, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded, e.total);
    xhr.onload = () => resolve(new Response(xhr.status === 204 ? null : xhr.responseText, { status: xhr.status }));
    xhr.onerror = () => reject(new Error('서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.'));
    xhr.send(body);
  });
}

// body가 FormData면 multipart, 객체면 JSON으로 보냄. 실패하면 서버의 에러 메시지로 Error를 던짐
// onProgress(보낸 바이트, 전체 바이트): 사진·영상 업로드 진행률
export async function api(path, { method = 'GET', body, onProgress } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const init = { method, headers, body: body instanceof FormData || !body ? body : JSON.stringify(body) };
  const res = onProgress ? await sendWithProgress(`/api${path}`, init, onProgress) : await fetch(`/api${path}`, init);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && token) {
    // 토큰 만료: 다시 로그인
    clearToken();
    window.location.hash = '#/login';
  }
  if (!res.ok) throw new Error(data?.error || `요청에 실패했습니다. (${res.status})`);
  return data;
}

// 값이 undefined/null인 항목은 빼고 FormData를 만듦. File 배열도 지원
export function formData(fields) {
  const f = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((v) => f.append(key, v));
    else f.append(key, value);
  }
  return f;
}

// 배너·단원 아이콘 사진 한 장 최대 용량(MB). 서버 storage.js의 MAX_MB.image(MAX_IMAGE_MB, 기본 20)와 같게
export const IMAGE_MAX_MB = 20;
export const tooBigImage = (file) => file.size > IMAGE_MAX_MB * 1024 * 1024;

// "2026-09-22" -> "2026.09.22" (화면 표시용)
export const displayDate = (d) => String(d || '').slice(0, 10).replace(/-/g, '.');

