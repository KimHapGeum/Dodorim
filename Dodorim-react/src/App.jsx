import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import SelectTopic from './pages/SelectTopic';
import KioskEdu from './pages/KioskEdu';
import Hospital from './pages/Hospital';
import PublicEdu from './pages/PublicEdu';
import Food from './pages/Food';
import SelfCheck from './pages/SelfCheck';
import MartEdu from './pages/MartEdu';
import SelfStoreEdu from './pages/SelfStoreEdu';
import DeviceEdu from './pages/DeviceEdu';
import Phone from './pages/Phone';
import Atm from './pages/Atm';
import Units from './pages/Units';
import Places from './pages/Places';
import ScreenList from './pages/ScreenList';
import Screen from './pages/Screen';
import Kiosk from './pages/Kiosk';
import Experience from './pages/Experience';
import Manager from './pages/Manager';
import UnitManager from './pages/UnitManager';
import Notice from './pages/Notice';
import Suggestion from './pages/Suggestion';
import Banner from './pages/Banner';
import Addition from './pages/Addition';
import Revise from './pages/Revise';
import Admins from './pages/Admins';
import { useEffect, useState } from 'react';
import { api, getToken } from './api';
import { DialogHost } from './dialog';
import { MeContext } from './me';

// 관리자 화면은 로그인(토큰)이 있어야 열림. 관리자 화면을 옮길 때마다 서버에 토큰이 아직 유효한지 물어봄
// (관리자 화면끼리 옮기면 React가 이 컴포넌트를 그대로 두므로 주소가 바뀔 때마다 다시 확인)
// 만료·위조된 토큰이면 api()가 토큰을 지우므로 로그인으로 보냄. 서버 연결 실패면 토큰을 남겨 두고 화면을 보여 줌(화면이 오류를 알림)
function Admin({ children }) {
  const [ok, setOk] = useState(null); // null = 확인 중
  const [me, setMe] = useState(null);
  const { pathname } = useLocation();
  useEffect(() => {
    if (getToken()) api('/auth/me').then((m) => { setMe(m); setOk(true); }, () => setOk(!!getToken()));
  }, [pathname]);
  if (!getToken() || ok === false) return <Navigate to="/login" replace />;
  return ok ? <MeContext.Provider value={me}>{children}</MeContext.Provider> : null;
}

// 정적 호스팅에서도 새로고침이 동작하도록 HashRouter 사용 (예: /#/kiosk_edu)
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select_topic" element={<SelectTopic />} />
        <Route path="/kiosk_edu" element={<KioskEdu />} />
        <Route path="/hospital" element={<Hospital />} />
        <Route path="/public_edu" element={<PublicEdu />} />
        <Route path="/food" element={<Food />} />
        <Route path="/self_check" element={<SelfCheck />} />
        <Route path="/mart_edu" element={<MartEdu />} />
        <Route path="/self_store_edu" element={<SelfStoreEdu />} />
        <Route path="/device_edu" element={<DeviceEdu />} />
        <Route path="/phone" element={<Phone />} />
        <Route path="/atm" element={<Atm />} />
        <Route path="/units" element={<Units />} />
        <Route path="/places" element={<Places />} />
        <Route path="/screen_list" element={<ScreenList />} />
        <Route path="/screen" element={<Screen />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/manager" element={<Admin><Manager /></Admin>} />
        <Route path="/unit_manager" element={<Admin><UnitManager /></Admin>} />
        <Route path="/notice" element={<Admin><Notice /></Admin>} />
        <Route path="/suggestion" element={<Admin><Suggestion /></Admin>} />
        <Route path="/banner" element={<Admin><Banner /></Admin>} />
        <Route path="/admins" element={<Admin><Admins /></Admin>} />
        <Route path="/addition" element={<Admin><Addition /></Admin>} />
        <Route path="/revise" element={<Admin><Revise /></Admin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DialogHost />
    </HashRouter>
  );
}
