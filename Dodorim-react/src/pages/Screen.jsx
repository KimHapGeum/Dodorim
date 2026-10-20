import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { api } from '../api';
import { useVoiceGuide } from '../voice';
import '../styles/screen.css';
import { confirm } from '../dialog';

// 설명 글자 크기는 강의를 옮기거나 다시 방문해도 유지
const FONT_KEY = 'dodorim_font_size';
const savedFontSize = () => { try { return Number(localStorage.getItem(FONT_KEY)) || null; } catch { return null; } };

const mediaStyle = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', minWidth: 0 };

// 슬라이드의 사진·영상. 여러 개면 나란히 표시
function SlideMedia({ media, placeholder }) {
  if (!media.length) return <div className="screen-placeholder">{placeholder}</div>;
  return (
    <div style={{ display: 'flex', gap: '12px', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '12px', boxSizing: 'border-box' }}>
      {media.map((m) => (m.type === 'video'
        ? <video key={m.url} src={m.url} controls style={mediaStyle} />
        : <img key={m.url} src={m.url} alt="" style={mediaStyle} />))}
    </div>
  );
}

// ?post=<게시글ID> → 강의 설명(있으면 첫 화면) + 슬라이드 1, 2, 3...
export default function Screen() {
  usePage('screen', '두드림 - 강의 보기');
  const navigate = useNavigate();
  const postId = useSearchParams()[0].get('post');
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(savedFontSize);

  useEffect(() => {
    if (fontSize) try { localStorage.setItem(FONT_KEY, fontSize); } catch { /* 저장 실패해도 동작 */ }
  }, [fontSize]);

  useEffect(() => {
    api(`/posts/${Number(postId) || 0}`).then(setPost, (e) => setError(e.message));
  }, [postId]);

  const pages = !post ? [] : [
    ...(post.description ? [{ key: 'intro', title: post.title, text: post.description, media: [] }] : []),
    ...post.slides.map((s) => ({ key: s.no, title: post.title, text: s.text, media: s.media })),
  ];
  const current = pages[currentIndex];
  const isLast = currentIndex >= pages.length - 1;
  useVoiceGuide(current ? current.text || current.title : '');

  const adjustFontSize = (amount) => setFontSize((prev) => Math.min(36, Math.max(16, (prev ?? 20) + amount)));
  const backToList = () => navigate(post ? `/screen_list?id=${post.categoryId}` : '/select_topic');

  const changeLecture = async (direction) => {
    if (direction > 0 && isLast) {
      if (await confirm('강의 학습 목록으로 넘어가시겠습니까?')) backToList();
      return;
    }
    setCurrentIndex((i) => Math.min(pages.length - 1, Math.max(0, i + direction)));
  };

  let title = current?.title;
  let text = current?.text;
  if (error) [title, text] = ['강의를 불러오지 못했습니다.', error];
  else if (post && !current) [title, text] = [post.title, '아직 슬라이드가 등록되지 않은 강의입니다.'];

  return (
    <>
      <div id="main-header-wrapper">
        <Header type="screen" onFontSize={adjustFontSize} />
      </div>

      <main className="viewer-wrapper">
        <button className="nav-btn prev-btn" style={{ display: currentIndex === 0 ? 'none' : 'flex' }} onClick={() => changeLecture(-1)}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>

        {/* key가 바뀌면 카드가 다시 마운트되어 slide-fade 애니메이션이 재생됩니다. */}
        <div key={current?.key ?? 'empty'} id="lectureCard" className="lecture-card slide-fade">
          <div className="screen-area" id="screenArea" style={{ backgroundColor: '#34495e' }}>
            <SlideMedia media={current?.media || []} placeholder={post ? `${post.title}` : ''} />
          </div>

          <div className="desc-area">
            <h2 id="lectureTitle" style={fontSize ? { fontSize: `clamp(22px, ${fontSize * 1.3}px, 42px)` } : undefined}>{title}</h2>
            <p id="lectureDesc" style={{ whiteSpace: 'pre-line', ...(fontSize ? { fontSize: `${fontSize}px` } : {}) }}>{text}</p>
          </div>
        </div>

        {pages.length > 0 && (
          <button
            className="nav-btn next-btn"
            style={{ display: 'flex' }}
            onClick={() => changeLecture(1)}
            aria-label={isLast ? '강의 목록으로 이동' : '다음 강의'}
            title={isLast ? '강의 목록으로 넘어갑니다.' : undefined}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        )}

        {pages.length > 0 && <div className="page-indicator">{`${currentIndex + 1} / ${pages.length}`}</div>}
      </main>
    </>
  );
}
