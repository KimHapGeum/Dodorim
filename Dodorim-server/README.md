# 두드림 서버 (Node.js + MariaDB)

React 프론트엔드(`../Dodorim-react`)와 API를 한 컨테이너에서 제공합니다. DB는 MariaDB 컨테이너를 따로 씁니다.

## NAS(Docker)에서 실행

1. `두드림` 폴더 전체를 NAS에 복사합니다 (`node_modules`, `dist`, `graphify-out`은 빼도 됩니다). `Dodorim-react`와 `Dodorim-server`가 같은 폴더 안에 있어야 합니다.
2. NAS 터미널(SSH)에서:
   ```bash
   cd 두드림/Dodorim-server
   cp .env.example .env
   nano .env                                  # 비밀번호, TOKEN_SECRET, SPEECH_API_KEY 입력
   mkdir -p data/storage && sudo chown -R 1000:1000 data/storage   # 앱 컨테이너는 uid 1000으로 실행
   docker compose up -d --build
   ```
3. 브라우저에서 `http://NAS주소:3000` 접속. 관리자 로그인은 `.env`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

- 데이터는 `Dodorim-server/data/` 아래에 남습니다: `data/mariadb`(DB 파일), `data/storage`(사진·영상·글). **백업할 때는 이 폴더 전체를 백업하세요.**
- `db/schema.sql`은 DB가 처음 만들어질 때(`data/mariadb`가 비어 있을 때) 한 번만 실행됩니다.
- 업데이트: 코드 교체 후 `docker compose up -d --build`
- 2026-10 관리자 계정 기능 추가 이후 첫 실행 때 서버가 `admins` 표에 `is_master`, `token_version` 열을 자동으로 추가하고, 가장 먼저 만든 계정을 마스터로 정합니다 (DB 계정에 ALTER 권한 필요, Docker 기본 설정은 있음). 이때 기존 로그인은 모두 풀리므로 다시 로그인하세요.
- 예전 DB 맞추기: 서버가 시작할 때마다 `src/db.js`의 `upgradeSchema()`가 예전 DB 구조를 지금 코드에 맞춥니다 (여러 번 실행해도 안전). 강의 대표 사진 기능을 없애면서 `posts.cover_file` 열도 이때 자동으로 지워집니다. 예전에 올린 대표 사진 파일(`posts/<ID>/cover.*`)이 있다면 쓰이지 않으니 지워도 됩니다.
- 건의 작성자 이름을 없애기 전에 만든 DB에는 쓰지 않는 `suggestions.name` 열이 남아 있습니다 (이전 건의의 이름이 들어 있을 수 있어 자동으로 지우지 않음). 지우려면: `ALTER TABLE suggestions DROP COLUMN name;`
- 건의 간격 제한은 IP 기준입니다. 리버스 프록시 뒤에서는 `TRUST_PROXY=1`을 설정해야 사용자마다 따로 계산됩니다. 한 기관에서 여러 사람이 같은 인터넷(공유기)을 쓰면 1분에 한 명만 보낼 수 있습니다.
- 로그: `docker compose logs -f app` — API 요청마다 한 줄씩 남습니다: `시각 IP 방법 주소 상태 걸린시간 [관리자 아이디]` (요청 내용·비밀번호는 남기지 않음, 상태 확인 `/api/health`는 제외)
- 보안 헤더: 모든 응답에 CSP(스크립트는 이 서버 것만, 글꼴·아이콘 CSS는 cdnjs·jsdelivr·Google Fonts만), X-Frame-Options 등을 붙입니다. **화면(index.html)에 다른 외부 CDN을 추가하면 `src/index.js`의 `CSP`에도 그 주소를 넣어야** 막히지 않습니다.
- 캐시: 빌드된 `assets/` 파일은 1년 캐시(파일 이름이 바뀌므로 안전), `index.html`은 매번 새 버전 확인 → 업데이트하면 사용자 화면에 바로 반영됩니다.
- 여러 관리자가 같은 강의의 슬라이드를 동시에 고쳐도 서버가 강의별로 한 번에 하나씩 처리합니다 (서버 1대 기준). 지울 때는 파일을 `trash/`로 옮긴 뒤 DB를 지우고, DB 삭제가 실패하면 파일을 되돌립니다.

## 로컬 실행 (윈도우, Docker 없이)

자세한 순서는 `../윈도우_테스트_방법.md`에 있습니다. 요약:

```bash
# MariaDB 설치 → dodorim DB 생성 → db/schema.sql 실행
cp .env.example .env    # DB_HOST=127.0.0.1 (localhost는 IPv6로 붙어 실패할 수 있음), DB_PORT 등 채우기
npm install
cd ../Dodorim-react && npm install && npm run build && cd ../Dodorim-server
npm run dev             # http://localhost:3000 (화면 + API)
```

- 화면 파일 위치는 `FRONTEND_DIR`로 정합니다. 비워 두면 `public/`(Docker 이미지) → 없으면 `../Dodorim-react/dist`(로컬)를 사용합니다. 화면 파일이 없으면 서버 창에 경고가 뜨고 `Cannot GET /`이 나옵니다.
- 화면 코드를 고치면서 보려면 `Dodorim-react`에서 `npm run dev` (http://localhost:5173, `/api`·`/files`는 3000번 서버로 전달).

## 테스트

둘 다 테스트 데이터를 만듭니다. **운영 DB에서는 실행하지 마세요.**

| 테스트 | 실행 | 내용 |
|---|---|---|
| API | `npm test` (서버를 켠 상태) | 로그인, 관리자 계정(마스터·하위 관리자·토큰 무효화), 단원 트리, 단원 이름 중복, 이미지 용량, 단원 설명 제한, 단원 순서·옮기기, 게시글·슬라이드 폴더·슬라이드 순서, 공지, 배너 순서, 건의(1분 간격), 음성 |
| 화면 클릭 | `Dodorim-react`에서 `BASE_URL=http://localhost:3000 ADMIN_USERNAME=admin ADMIN_PASSWORD=... npm run test:smoke` | 강의 등록·수정, 단원 관리(추가·수정·삭제), 학습자 선택 화면(3개씩 넘기기, 카드 크기·아이콘 크기), 공지, 배너, 건의 |

건의는 같은 IP에서 1분에 1번만 보낼 수 있으므로 두 테스트를 이어서 돌릴 때는 1분 기다리세요.

테스트 후 데이터를 처음 상태로 되돌리려면 `../윈도우_테스트_방법.md`의 "처음부터 다시 (데이터 초기화)"를 따르세요.

## 화면 구성

**학습자 화면** — 단원(분류) DB를 읽어 카드로 보여 줍니다. 관리자가 단원을 추가·수정하면 바로 반영됩니다.

```
주제 선택(대단원) → 중단원 선택 → 소단원 선택 → 강의 목록 → 강의(슬라이드)
/select_topic        /kiosk_edu 등    /hospital 등    /screen_list?id=   /screen?post=
                     새 대단원: /units?id=   새 중단원: /places?id=
```

- 카드는 한 화면에 3개씩, 넘치면 좌우 화살표로 넘깁니다. 모든 카드 크기는 대단원 카드(340×377px) 기준입니다 (`Dodorim-react/src/styles/select_grid.css`).
- 카드 그림: 관리자가 올린 아이콘 → 없으면 기본 단원의 기존 그림(`src/data/places.js`) → 없으면 기본 아이콘. 올린 아이콘은 같은 화면의 기존 아이콘과 같은 크기로 맞춰집니다.
- 카드 설명은 2줄(30자)까지, 단원 이름은 한 줄(길면 …)로 보여 그림 크기가 글 길이에 따라 바뀌지 않습니다.
- 기본 단원(키오스크, 병원 등)은 이름으로 전용 화면·그림을 찾으므로, 이름을 바꾸면 공용 화면·기본 모양으로 바뀝니다.

**관리자 화면** (로그인 필요)

처음 만들어지는 계정(`.env`의 `ADMIN_USERNAME`)이 **마스터 계정**입니다. 마스터는 [관리자 계정] 메뉴에서 하위 관리자 계정을 추가·수정(아이디, 비밀번호 재설정)·삭제할 수 있고, 하위 관리자는 자기 비밀번호만 바꿀 수 있습니다. 나머지 관리 기능은 둘 다 같습니다. 비밀번호를 바꾸거나 계정을 지우면 그 계정의 기존 로그인은 바로 끊깁니다.

| 메뉴 | 기능 |
|---|---|
| 강의 목록 관리 | 대단원 > 중단원별 강의 목록, 검색·필터, [신규 강의 등록] → 소단원 선택 + 제목 + 설명 + 슬라이드(글·사진·영상, 순서 변경), 수정·삭제 |
| 단원 관리 | 대단원 > 중단원 > 소단원 폴더 트리. 폴더마다 하위 단원 추가, 단원별 수정(이름·설명·아이콘·상위 단원 옮기기)·순서 변경·삭제. 강의가 들어 있는 단원은 삭제 불가 |
| 공지사항 관리 | 메인 화면 공지 등록·수정·삭제, 첨부파일 추가·삭제 |
| 건의사항 관리 | 학습자가 보낸 건의 확인, 처리 상태 변경 |
| 배너 관리 | 메인 화면 슬라이더 배너 등록·수정·삭제·순서 |
| 관리자 계정 | 마스터: 하위 관리자 추가·수정·삭제 / 모두: 내 비밀번호 변경 |

## 음성 안내 (Text-to-Speech)

- `.env`의 `SPEECH_API_KEY`에 키를 넣으면 켜집니다. 키는 서버에만 있고 브라우저로 나가지 않습니다.
- 현재 구현: Google Cloud Text-to-Speech (`SPEECH_PROVIDER=google`). 목소리는 `SPEECH_VOICE`, 속도는 `SPEECH_RATE`.
- 다른 업체는 `src/routes/speech.js`의 `providers`에 함수를 추가하세요.
- `POST /api/speech/tts` `{ "text": "..." }` → MP3. 같은 문장은 `storage/tts-cache`에 저장해 재사용합니다.
- 캐시는 `SPEECH_CACHE_DAYS`(기본 30)일 동안 한 번도 쓰이지 않은 파일을 서버 시작 때와 하루 한 번 지웁니다.
- 비용 폭주 방지: 캐시에 없는 문장의 유료 호출은 하루 `SPEECH_DAILY_LIMIT`(기본 2000)회까지. 넘으면 그날은 브라우저 내장 음성으로 읽습니다 (서버를 다시 켜면 횟수는 0부터).
- 키가 없으면 화면은 브라우저 내장 음성(speechSynthesis)으로 대신 읽어 줍니다.
- 브라우저는 사용자가 화면을 한 번 누르기 전에는 소리 자동 재생을 막을 수 있습니다.

## 파일 저장 구조 (`data/storage`)

```
posts/<게시글ID>/<슬라이드번호>/text.txt   슬라이드 글
posts/<게시글ID>/<슬라이드번호>/사진·영상
notices/<공지ID>/content.txt             공지 본문
notices/<공지ID>/첨부파일                 공지사항 관리에서 추가·삭제, 메인 공지 팝업에서 내려받기
banners/<배너ID>/이미지
categories/<분류ID>/아이콘                단원 선택 화면 카드 그림
tts-cache/                              음성 안내 MP3 캐시 (지워도 다시 만들어짐, 30일 안 쓰면 자동 삭제)
tmp/, trash/                            업로드 임시 파일, 지우는 중인 파일 (서버 시작 때 비움, 공개 안 함)
```

## API 요약

관리자 표시(🔒)는 `Authorization: Bearer <토큰>` 필요. 토큰은 `POST /api/auth/login`으로 받습니다. 👑는 마스터 계정만.

파일 1개 최대 용량: 사진만 받는 곳(배너, 단원 아이콘)은 `MAX_IMAGE_MB`(기본 20), 슬라이드 사진·영상과 공지 첨부는 `MAX_UPLOAD_MB`(기본 500).

| 기능 | 요청 |
|---|---|
| 로그인 | `POST /api/auth/login` `{username, password}` · `GET /api/auth/me` 🔒 (`{id, username, master}`) · `PUT /api/auth/password` 🔒 `{currentPassword, newPassword}` → 새 토큰 |
| 관리자 계정 | `GET /api/admins` · `POST` `{username, password}` · `PUT /:id` `{username?, password?}` · `DELETE /:id` 👑 (마스터 계정 자체는 바꾸거나 지울 수 없음) |
| 분류(단원) | `GET /api/categories` (트리) · `POST` / `PUT /:id` / `DELETE /:id` 🔒 (multipart: parentId, name, description(30자·2줄 이하), sortOrder, icon). 같은 상위 단원 안(대단원끼리 포함)에 같은 이름은 409. `PUT`에 parentId를 보내면 같은 단계의 다른 상위 단원으로 옮김. 삭제는 하위 단원까지, 강의가 있으면 409 · `PUT /api/categories/order` 🔒 `{ids:[...]}` (같은 상위 단원 안의 순서) |
| 게시글 | `GET /api/posts?categoryId=&q=` · `GET /api/posts/:id` (슬라이드 포함) · `POST` / `PUT /:id` / `DELETE /:id` 🔒 (multipart: title, categoryId(소단원), description) |
| 슬라이드 | `PUT /api/posts/:id/slides/:no` 🔒 (multipart: text, files[]) · `PUT /api/posts/:id/slides/order` 🔒 `{order:[3,1,2]}` (지금 번호를 새 순서대로) · `DELETE /api/posts/:id/slides/:no` 🔒 (뒤 번호 당김) · `DELETE /api/posts/:id/slides/:no/files/:name` 🔒 |
| 공지 | `GET /api/notices` · `GET /api/notices/:id` · `POST` / `PUT /:id` / `DELETE /:id` 🔒 (multipart: title, date, content, files[]) · `DELETE /api/notices/:id/files/:name` 🔒 |
| 배너 | `GET /api/banners` · `POST` / `PUT /:id` / `DELETE /:id` 🔒 (multipart: title, desc, color, subColor, image) · `PUT /api/banners/order` 🔒 `{ids:[...]}` |
| 건의 | `POST /api/suggestions` `{content}` (같은 IP에서 1분에 1번) · `GET /api/suggestions?status=&sort=` 🔒 · `PATCH /:id` `{status}` 🔒 · `DELETE /:id` 🔒 |
| 음성 | `GET /api/speech/status` · `POST /api/speech/tts` `{text}` → MP3 |
| 파일 | `GET /files/...` (업로드한 파일) |
