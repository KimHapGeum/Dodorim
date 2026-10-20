import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { api, formData } from '../api';
import { LectureDescription, SlideGrid, SlideModal } from '../components/LectureEditor';
import '../styles/revise.css';
import { alert, confirm } from '../dialog';
import useLeaveWarning from '../useLeaveWarning';

// 서버 슬라이드 → 카드 요약
const summarize = (s) => {
  const first = s.media.find((m) => m.type === 'image') || s.media[0];
  return {
    text: s.text,
    thumb: first ? { url: first.url, video: first.type === 'video' } : null,
    imageCount: s.media.filter((m) => m.type === 'image').length,
    videoCount: s.media.filter((m) => m.type === 'video').length,
  };
};

/*
 * 강의 수정
 * - 제목·설명·분류는 [수정 내용 저장]을 눌러야 반영
 * - 슬라이드 추가/수정/삭제/순서 변경과 사진·영상 삭제는 누르는 즉시 서버 폴더에 반영
 */
export default function Revise() {
  usePage('revise', '관리자 - 강의 콘텐츠 수정');
  const navigate = useNavigate();
  const lectureId = Number(useSearchParams()[0].get('id')) || 0;
  const [tree, setTree] = useState([]);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [catM, setCatM] = useState('');
  const [catD, setCatD] = useState('');
  const [catS, setCatS] = useState('');
  const [modal, setModal] = useState(null); // { slide: index }
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // 슬라이드 업로드 진행률(%) | null

  // 제목·설명·분류를 바꾸고 저장하지 않았거나 업로드 중이면 나가기 전에 확인
  const dirty = !!post && (title !== post.title || description !== (post.description || '') || Number(catS) !== post.categoryId);
  useLeaveWarning(dirty || busy);
  const cancelToList = async (e) => {
    e.preventDefault();
    if (!dirty || await confirm('저장하지 않은 내용이 있습니다. 목록으로 나가시겠습니까?')) navigate('/manager');
  };

  const reloadPost = () => api(`/posts/${lectureId}`).then(setPost);

  useEffect(() => {
    Promise.all([api('/categories'), api(`/posts/${lectureId}`)])
      .then(([t, p]) => {
        setTree(t);
        setPost(p);
        // 폼에 기존 값 채우기: 소단원 id로 대/중단원을 찾음
        for (const m of t) for (const d of m.children) for (const s of d.children) {
          if (s.id === p.categoryId) { setCatM(String(m.id)); setCatD(String(d.id)); setCatS(String(s.id)); }
        }
        setTitle(p.title);
        setDescription(p.description || '');
      })
      .catch((e) => {
        alert(`수정할 강의 정보를 찾을 수 없습니다. 목록에서 다시 시도해주세요.\n(${e.message})`).then(() => navigate('/manager'));
      });
  }, [lectureId, navigate]);

  const mids = tree.find((c) => String(c.id) === catM)?.children || [];
  const subs = mids.find((c) => String(c.id) === catD)?.children || [];

  // 슬라이드 관련 즉시 반영 요청
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await reloadPost();
      return true;
    } catch (e) {
      alert(e.message);
      // 다른 관리자가 같은 강의를 고쳤을 수 있으니 서버의 지금 상태로 다시 보여 줌
      await reloadPost().catch(() => {});
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveSlide = async (index, data) => {
    if (data.files.length) setProgress(0);
    const ok = await run(() => api(`/posts/${lectureId}/slides/${index + 1}`, {
      method: 'PUT',
      body: formData({ text: data.text, files: data.files }),
      onProgress: data.files.length ? (loaded, all) => setProgress(Math.floor((loaded / all) * 100)) : undefined,
    }));
    setProgress(null);
    if (ok) setModal(null);
  };

  const deleteSlide = async (index) => {
    if (await confirm(`슬라이드 ${index + 1}을(를) 삭제하시겠습니까? 뒤 슬라이드 번호가 하나씩 당겨집니다.`)) {
      run(() => api(`/posts/${lectureId}/slides/${index + 1}`, { method: 'DELETE' }));
    }
  };

  // 앞/뒤 슬라이드와 자리 바꾸기 (바로 저장)
  const reorderSlide = (index, dir) => {
    const order = post.slides.map((s) => s.no);
    [order[index], order[index + dir]] = [order[index + dir], order[index]];
    run(() => api(`/posts/${lectureId}/slides/order`, { method: 'PUT', body: { order } }));
  };

  const deleteMedia = async (index, name) => {
    if (await confirm(`${name} 파일을 삭제하시겠습니까?`)) run(() => api(`/posts/${lectureId}/slides/${index + 1}/files/${encodeURIComponent(name)}`, { method: 'DELETE' }));
  };

  const saveEditLecture = async () => {
    const t = title.trim();
    if (!t || !catM || !catD || !catS) { alert('강의 제목 및 카테고리를 완전히 선택해주세요.'); return; }
    setBusy(true);
    try {
      await api(`/posts/${lectureId}`, {
        method: 'PUT',
        body: formData({ title: t, description: description.trim(), categoryId: catS }),
      });
    } catch (e) {
      alert(e.message);
      setBusy(false);
      return;
    }
    await alert('수정 내용이 저장되었습니다.');
    navigate('/manager');
  };

  if (!post) return null;
  const editing = modal?.slide !== undefined ? modal.slide : null;

  return (
    <>
      <div className="header-iframe"><Header type="hidden" /></div>

      <main className="outer-card">
        <div className="form-card-panel">
          <div className="form-area">
            <div className="input-group">
              <label>강의 제목</label>
              <input type="text" className="text-input" placeholder="강의 제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label>카테고리</label>
              <div className="select-group">
                <select className="select-box" value={catM} onChange={(e) => { setCatM(e.target.value); setCatD(''); setCatS(''); }}>
                  <option value="">대단원 선택</option>
                  {tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="select-box" value={catD} onChange={(e) => { setCatD(e.target.value); setCatS(''); }}>
                  <option value="">중단원 선택</option>
                  {mids.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="select-box" value={catS} onChange={(e) => setCatS(e.target.value)}>
                  <option value="">소단원 선택</option>
                  {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <LectureDescription value={description} onChange={setDescription} />
          </div>

          <hr className="section-divider" />
          <div className="section-title">슬라이드 구성 <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>(슬라이드 변경은 바로 저장됩니다)</span></div>

          <SlideGrid
            slides={post.slides.map(summarize)}
            onAddSlide={() => setModal({ slide: post.slides.length })}
            onEditSlide={(i) => setModal({ slide: i })}
            onDeleteSlide={deleteSlide}
            onMoveSlide={(i, dir) => !busy && reorderSlide(i, dir)}
          />

          <div className="footer-nav">
            <Link to="/manager" className="btn btn-back" onClick={cancelToList}>취소하고 목록으로</Link>
            <button className="btn btn-next" style={{ background: '#10b981' }} onClick={saveEditLecture} disabled={busy}>수정 내용 저장</button>
          </div>
        </div>
      </main>

      {editing !== null && (
        <SlideModal
          no={editing + 1}
          edit
          initial={post.slides[editing] && { text: post.slides[editing].text, media: post.slides[editing].media }}
          onDeleteMedia={(name) => deleteMedia(editing, name)}
          onClose={() => setModal(null)}
          onComplete={(data) => saveSlide(editing, data)}
          progress={progress}
        />
      )}
    </>
  );
}
