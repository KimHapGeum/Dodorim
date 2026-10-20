import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { useVoiceGuide } from '../voice';
import PagedGrid from './PagedGrid';
import { descStyle, findCategory, useCategoryTree } from '../categories';
import { MID_LOOK, midRoute } from '../data/places';
import { clickable } from '../a11y';

/*
 * 대단원 안의 중단원 선택 화면 (키오스크/셀프 계산대/전자기기 + 새로 만든 대단원).
 * main: 대단원 id 또는 이름 경로(['키오스크']). variant 'location'은 키오스크 화면의 큰 카드 모양
 */
export default function UnitSelect({ main, title, subtitle, stepIndicator, variant, backClass = 'btn-back-bottom' }) {
  const navigate = useNavigate();
  const tree = useCategoryTree();
  const node = tree && findCategory(tree, main);
  const mids = node?.children || [];
  useVoiceGuide(`${title} ${subtitle}`);

  const icon = (c) => (c.iconUrl
    ? <img className="unit-icon" src={c.iconUrl} alt="" />
    : <i className={`fa-solid ${MID_LOOK[c.name]?.icon || 'fa-shapes'}`}></i>);

  return (
    <>
      <div id="main-header-wrapper">
        <Header type="edu" />
      </div>

      <main className="main-content">
        <div className="step-indicator">{stepIndicator || (node ? `${node.name} 학습` : ' ')}</div>

        <div className="title-group">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <PagedGrid
          className={variant === 'location' ? 'location-container' : 'lecture-grid'}
          items={mids}
          loaded={!!tree}
          render={(c, i) => {
            const look = MID_LOOK[c.name];
            const desc = <p style={descStyle}>{c.description || look?.desc}</p>;
            return variant === 'location' ? (
              <div key={c.id} className={`location-card card-${i + 1}`} {...clickable(() => navigate(midRoute(c, node.name)))}>
                <div className={`card-img ${look?.bg || 'bg-hospital'}`}>{icon(c)}</div>
                <div className="card-body"><h2 title={c.name}>{c.name}</h2>{desc}</div>
              </div>
            ) : (
              <div key={c.id} className="card" style={{ animationDelay: `${i * 0.1 + 0.1}s` }} {...clickable(() => navigate(midRoute(c, node.name)))}>
                <div className={`img-box ${look?.bg || ''}`}>{icon(c)}</div>
                <h2 title={c.name}>{c.name}</h2>
                {desc}
              </div>
            );
          }}
        />

        <button className={backClass} onClick={() => navigate('/select_topic')}>
          <i className="fa-solid fa-arrow-left"></i> 이전 화면으로 가기
        </button>
      </main>

      <footer>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</footer>
    </>
  );
}
