import { createContext, useContext } from 'react';

// 로그인한 관리자 { id, username, master }. 관리자 화면(App.jsx의 Admin)이 /api/auth/me로 받아 넣어 줌. 서버 연결 실패 시 null
export const MeContext = createContext(null);
export const useMe = () => useContext(MeContext);
