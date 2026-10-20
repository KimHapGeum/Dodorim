import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 중에는 API와 업로드 파일 요청을 백엔드(Dodorim-server, 기본 3000번)로 넘깁니다.
const backend = process.env.BACKEND_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { proxy: { '/api': backend, '/files': backend } },
  preview: { proxy: { '/api': backend, '/files': backend } },
});
