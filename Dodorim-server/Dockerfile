# 두드림 앱 이미지 (프론트엔드 + 백엔드 한 컨테이너)
# 빌드 컨텍스트는 상위 폴더(두드림)입니다: docker compose가 알아서 지정합니다.

# 1) React 프론트엔드 빌드
FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY Dodorim-react/package*.json ./
RUN npm ci
COPY Dodorim-react/ ./
RUN npm run build

# 2) 서버 의존성 설치 (운영용만)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY Dodorim-server/package*.json ./
RUN npm ci --omit=dev

# 3) 실행 이미지: Ubuntu 24.04 + Node 22 실행 파일
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive TZ=Asia/Seoul NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*
# node 바이너리는 glibc만 필요하므로 공식 이미지에서 그대로 복사 (Ubuntu 24.04의 glibc가 더 최신)
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY Dodorim-server/package.json ./
COPY Dodorim-server/src ./src
COPY --from=web /web/dist ./public

# 업로드 파일은 볼륨(/data/storage)에 저장. ubuntu 이미지의 기본 사용자(uid 1000)로 실행
ENV PORT=3000 STORAGE_DIR=/data/storage FRONTEND_DIR=/app/public
RUN mkdir -p /data/storage && chown -R ubuntu:ubuntu /data
USER ubuntu
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
