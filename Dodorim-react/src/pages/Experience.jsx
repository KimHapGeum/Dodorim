import { useNavigate } from 'react-router-dom';
import usePage from '../usePage';
import Header from '../components/Header';
import ExperiencePage from '../experience/ExperiencePage';

// 체험 화면에는 자체 '소리로 안내 듣기'가 있어서 상단바는 로고만 (로그인·음성 버튼 없음)
export default function Experience() {
  usePage('experience', '두드림 - 체험하기');
  const navigate = useNavigate();
  return (
    <>
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #ebf0f5', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', position: 'relative', zIndex: 9999 }}>
        <Header type="hidden" />
      </div>
      <ExperiencePage onHome={() => navigate('/')} />
    </>
  );
}
