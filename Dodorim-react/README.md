# 두드림 (React)

종합 전자기기 교육 플랫폼 두드림의 화면입니다. 데이터는 백엔드(`../Dodorim-server`)의 API에서 가져옵니다.
운영(NAS Docker)에서는 백엔드가 이 화면을 함께 빌드해서 띄우므로 따로 실행할 필요가 없습니다. → `../Dodorim-server/README.md`

## 개발

```bash
# 1) 백엔드 실행 (Dodorim-server 폴더에서, 기본 3000번)
npm run dev
# 2) 화면 실행 (이 폴더에서). /api, /files 요청은 3000번 백엔드로 넘어갑니다.
npm install
npm run dev        # http://localhost:5173  (백엔드 주소가 다르면 BACKEND_URL=http://... npm run dev)
npm run build      # dist/ 생성
```

### 전체 흐름 테스트

백엔드가 빌드된 화면을 띄운 상태에서 (Chrome 필요, 테스트 데이터를 만들므로 운영 서버 금지):

```bash
BASE_URL=http://localhost:3000 ADMIN_USERNAME=admin ADMIN_PASSWORD=비밀번호 npm run test:smoke
```

## 구조

- `src/App.jsx` — 라우팅 (HashRouter, 예: `/#/kiosk_edu`). 관리자 화면은 로그인해야 열림
- `src/api.js` — 백엔드 API 호출, 관리자 토큰 보관
- `src/voice.js` — 음성 안내(TTS). 서버 `/api/speech/tts` MP3 재생, 서버에 키가 없으면 브라우저 내장 음성. 켜짐/꺼짐은 모든 화면 공유
- `src/pages/` — 페이지별 컴포넌트
- `src/components/` — 공통 헤더, 관리자 사이드바, 장소 선택 템플릿, 강의(슬라이드) 편집 UI
- `src/styles/` — 페이지별 CSS (`body.page-<이름>` 아래로 스코프)
- `src/data/defaults.js` — 서버에 공지/배너가 없을 때 쓰는 기본값
- `public/` — 이미지

## 화면 ↔ 데이터

| 화면 | 데이터 |
|---|---|
| 메인 | 배너 `/api/banners`, 공지 `/api/notices` (없으면 기본값) |
| 장소 선택 → 강의 목록 | 소단원 이름으로 분류를 찾아 `/api/posts?categoryId=` |
| 강의 보기 | `/api/posts/:id` — 메인 소개 + 슬라이드(글·사진·영상), 슬라이드 글을 음성으로 읽음 |
| 건의하기 | `POST /api/suggestions` |
| 관리자 | 로그인 `/api/auth/login`, 강의·단원·공지·건의·배너 관리 API |
