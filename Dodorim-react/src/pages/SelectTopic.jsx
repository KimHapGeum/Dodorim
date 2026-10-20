import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { useVoiceGuide } from '../voice';
import PagedGrid from '../components/PagedGrid';
import { descStyle, useCategoryTree } from '../categories';
import { MAIN_LOOK, mainRoute } from '../data/places';
import '../styles/select_topic.css';
import { clickable } from '../a11y';

export default function SelectTopic() {
  usePage('select_topic', '두드림 - 주제 선택');
  const navigate = useNavigate();
  const tree = useCategoryTree();
  const mains = tree || [];
  useVoiceGuide('어떤 것을 배워볼까요? 배우고 싶은 기기 그림을 살짝 눌러주세요.');

  return (
    <>
      <div id="main-header-wrapper">
        <Header type="edu" />
      </div>

      <main className="main-content">
        <div className="title-group">
          <h1>어떤 것을 배워볼까요?</h1>
          <p>배우고 싶은 기기 그림을 살짝 눌러주세요.</p>
        </div>

        <PagedGrid
          className="topic-container"
          items={mains}
          loaded={!!tree}
          render={(c) => {
            const look = MAIN_LOOK[c.name];
            return (
              <div key={c.id} className="card" {...clickable(() => navigate(mainRoute(c)))}>
                <div className="icon-box">
                  {c.iconUrl ? <img className="unit-icon" src={c.iconUrl} alt="" /> : <i className={`fa-solid ${look?.icon || 'fa-shapes'}`}></i>}
                </div>
                <h2 title={c.name}>{c.name}</h2>
                <p style={descStyle}>{c.description || look?.desc}</p>
              </div>
            );
          }}
        />

        <button className="home-button" onClick={() => navigate('/')}>
          <i className="fa-solid fa-arrow-left"></i> 메인 화면으로 가기
        </button>
      </main>

      <footer>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</footer>
    </>
  );
}
