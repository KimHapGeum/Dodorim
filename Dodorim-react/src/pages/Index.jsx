import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { DEFAULT_NOTICES, DEFAULT_BANNERS } from '../data/defaults';
import { api, displayDate } from '../api';
import '../styles/index.css';
import { clickable } from '../a11y';


function NoticeModal({ notices, onClose }) {
  // notices는 최신순으로 정렬되어 들어온다고 가정 (배열 맨 앞 = 가장 최근 공지)
  const [selectedId, setSelectedId] = useState(notices[0] ? notices[0].id : null);
  const selected = notices.find(n => n.id === selectedId) || notices[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label="공지사항" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="modal-header">
          <h2>공지사항</h2>
          <button className="modal-close" onClick={onClose} aria-label="닫기" autoFocus><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="notice-select-list">
          {notices.map((notice, index) => (
            <div
              key={notice.id}
              className={`notice-select-row ${selectedId === notice.id ? 'active' : ''}`}
              {...clickable(() => setSelectedId(notice.id))}
              aria-current={selectedId === notice.id}
            >
              {index === 0 && <span className="new-tag">NEW</span>}
              <span className="notice-select-title">{notice.title}</span>
              <span className="notice-select-date">{notice.date}</span>
              <i className="fa-solid fa-chevron-right notice-select-chevron"></i>
            </div>
          ))}
        </div>

        {selected && (
          <div className="notice-detail">
            <div className="notice-detail-title">{selected.title}</div>
            <div className="notice-detail-date">{selected.date}</div>
            <div className="notice-detail-content">{selected.content}</div>
            {selected.attachments?.length > 0 && (
              <div className="notice-detail-files">
                {selected.attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer"><i className="fa-solid fa-paperclip"></i> {a.name}</a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 배너(슬라이더)와 공지사항은 관리자 페이지에서 등록한 데이터를 서버에서 불러옵니다.
// 등록된 것이 없거나 서버에 연결할 수 없으면 기본 배너/공지를 보여줍니다.
export default function Index() {
  usePage('index', '두드림 - 시니어 디지털 자립');
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([api('/banners'), api('/notices')])
      .then(([banners, notices]) => setData({
        slideData: banners.length ? banners : DEFAULT_BANNERS,
        noticeList: notices.length ? notices.map((n) => ({ ...n, date: displayDate(n.date) })) : DEFAULT_NOTICES,
      }))
      .catch(() => setData({ slideData: DEFAULT_BANNERS, noticeList: DEFAULT_NOTICES }));
  }, []);

  if (data) return <Home {...data} />;
  return (
    <>
      <div className="header-wrapper">
        <Header />
      </div>
      <div style={{ flex: 1 }}></div>
      <footer>
        © 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.
      </footer>
    </>
  );
}

function Home({ slideData, noticeList }) {
  const navigate = useNavigate();

  // 배너 개수(홀수/짝수 모두)와 무관하게 항상 중앙에 가장 가까운 슬라이드에서 시작
  const [currentIndex, setCurrentIndex] = useState(Math.round((slideData.length - 1) / 2));
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const currentSlide = slideData[currentIndex];
  const latestNotice = noticeList[0];
  // 슬라이드가 짝수 개일 때도 정확히 중앙에 오도록, 배열 전체의 중간 지점을 기준으로 이동량을 계산
  const centerOffset = (slideData.length - 1) / 2;

  const handlePrev = () => setCurrentIndex(prev => (prev === 0 ? slideData.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex(prev => (prev === slideData.length - 1 ? 0 : prev + 1));

  return (
    <>
    <div className="header-wrapper">
      <Header />
    </div>

    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="color-strip" style={{ backgroundColor: currentSlide.color }}></div>

      {/* 공지 바도 지금 슬라이드 색을 따라감 (--slide-color: 배지·화살표, --slide-sub: 바탕을 옅게) */}
      <div className="notice-bar" style={{ '--slide-color': currentSlide.color, '--slide-sub': currentSlide.subColor }} {...clickable(() => setIsNoticeOpen(true))}>
        <span className="notice-badge">공지</span>
        <span className="notice-text">{latestNotice.title}</span>
        <i className="fa-solid fa-chevron-right notice-arrow"></i>
      </div>

      <div className="slider-outer">
        <button className="nav-btn prev" onClick={handlePrev}><i className="fa-solid fa-chevron-left"></i></button>
        <div className="slider-inner" style={{ transform: `translateX(calc(${-(currentIndex - centerOffset)} * (var(--slide-w) + 30px)))` }}>
          {slideData.map((slide, index) => (
            <div key={index} className={`slide ${index === currentIndex ? 'active' : ''}`}>
              <img src={slide.img} alt={slide.title} />
            </div>
          ))}
        </div>
        <button className="nav-btn next" onClick={handleNext}><i className="fa-solid fa-chevron-right"></i></button>
      </div>
      
      <div className="hero">
        <div className="hero-text">
          <h1>{currentSlide.title}</h1>
          <p style={{ whiteSpace: 'pre-line' }}>{currentSlide.desc}</p>
        </div>

        <div className="btn-group">
          <button className="start-btn" style={{ backgroundColor: currentSlide.color }} onClick={() => navigate('/select_topic')}>
            교육 시작하기
          </button>
          <button className="practice-btn" style={{ backgroundColor: currentSlide.subColor }} onClick={() => navigate('/experience')}>
  체험하기
</button>
        </div>

        <div className="cards">
          <div className="card">천천히 눌러도 괜찮아요</div>
          <div className="card">뒤에 사람 신경 쓰지 마세요</div>
          <div className="card">언제든 도움을 요청하세요</div>
        </div>
      </div>

      {isNoticeOpen && <NoticeModal notices={noticeList} onClose={() => setIsNoticeOpen(false)} />}
    </div>

    <footer>
      © 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.
    </footer>
    </>
  );
}


