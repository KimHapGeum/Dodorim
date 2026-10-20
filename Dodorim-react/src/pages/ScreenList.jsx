import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { api } from '../api';
import { findCategory } from '../categories';
import { midRoute } from '../data/places';
import { useVoiceGuide } from '../voice';
import '../styles/screen_list.css';
import { clickable } from '../a11y';

// ?id=소단원ID → 그 소단원에 등록된 게시글(강의) 목록
export default function ScreenList() {
  usePage('screen_list', '두드림');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const [sub, setSub] = useState('');
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [backTo, setBackTo] = useState('/select_topic'); // 이 소단원을 고른 장소 선택 화면
  const heading = sub ? `${sub} 강의 학습 목록` : '강의 학습 목록';
  useVoiceGuide(`${heading}. 배우고 싶은 강의를 눌러주세요.`);

  useEffect(() => {
    (async () => {
      const tree = await api('/categories');
      const subNode = findCategory(tree, id);
      setSub(subNode?.name || '');
      const mid = subNode && findCategory(tree, subNode.parentId);
      const main = mid && findCategory(tree, mid.parentId);
      if (mid) setBackTo(midRoute(mid, main?.name));
      setPosts(subNode ? await api(`/posts?categoryId=${subNode.id}`) : []);
    })().catch((e) => setError(e.message));
  }, [id]);

  let body;
  if (error) body = <div className="lecture-row-card"><div className="lecture-info-text"><h2>강의 목록을 불러오지 못했습니다.</h2><p>{error}</p></div></div>;
  else if (!posts) body = null;
  else if (posts.length === 0) body = <div className="lecture-row-card"><div className="lecture-info-text"><h2>아직 등록된 강의가 없습니다.</h2><p>조금만 기다려 주세요. 곧 강의가 올라옵니다.</p></div></div>;
  else {
    // 등록 순서대로 1, 2, 3...
    body = [...posts].reverse().map((p, i) => (
      <div key={p.id} className="lecture-row-card" {...clickable(() => navigate(`/screen?post=${p.id}`))}>
        <div className="lecture-info-text">
          <h2>{i + 1}. {p.title}</h2>
          <p>{p.description || `슬라이드 ${p.slideCount}장`}</p>
        </div>
      </div>
    ));
  }

  return (
    <>
      <div id="main-header-wrapper">
        <Header type="edu" />
      </div>

      <main className="container">
        <div className="subject-section fade-in-up">
          <h1 id="brand-title">{heading}</h1>
          <p>단계별로 키오스크 및 무인기기 이용법을 학습해 보세요.</p>
        </div>

        <div className="lecture-list-container fade-in-up">{body}</div>

        <div className="list-bottom">
          <button className="btn-back-bottom" onClick={() => navigate(backTo)}>
            <i className="fa-solid fa-arrow-left"></i> 이전 화면으로 가기
          </button>
        </div>
      </main>

      <footer>
        © 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.
      </footer>
    </>
  );
}
