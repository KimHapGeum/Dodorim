import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { api, formData } from '../api';
import { isVideo, LectureDescription, SlideGrid, SlideModal } from '../components/LectureEditor';
import '../styles/addition.css';
import { alert, confirm } from '../dialog';
import useLeaveWarning from '../useLeaveWarning';

// 화면에 보여줄 슬라이드 요약 (첫 사진 미리보기 포함)
const summarize = (slide) => {
  const first = slide.files.find((f) => !isVideo(f)) || slide.files[0];
  return {
    text: slide.text,
    thumb: first ? { url: slide.thumbUrl, video: isVideo(first) } : null,
    imageCount: slide.files.filter((f) => !isVideo(f)).length,
    videoCount: slide.files.filter(isVideo).length,
  };
};
const withThumb = (slide) => {
  const first = slide.files.find((f) => !isVideo(f));
  return { ...slide, thumbUrl: first ? URL.createObjectURL(first) : null };
};

export default function Addition() {
  // 단원(대/중/소) 등록은 [단원 관리] 화면(UnitManager)으로 옮김. 여기서는 강의만 등록
  usePage('addition', '관리자 - 새 강의 콘텐츠 등록');
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [catM, setCatM] = useState(''); // 분류 id (문자열)
  const [catD, setCatD] = useState('');
  const [catS, setCatS] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slide, setSlide] = useState(0);
  const [slides, setSlides] = useState([]); // [{ text, files: File[], thumbUrl }]
  const [modal, setModal] = useState(null); // { slide: index }
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null); // 업로드 진행률(%) | null

  // 입력한 내용이 있으면 탭 닫기·새로고침 전에 확인, 목록으로 나갈 때도 확인
  const dirty = !!(title.trim() || description.trim() || slides.length);
  useLeaveWarning(dirty || saving);
  const cancelToList = async (e) => {
    e.preventDefault();
    if (!dirty || await confirm('저장하지 않은 내용이 있습니다. 목록으로 나가시겠습니까?')) navigate('/manager');
  };

  useEffect(() => { api('/categories').then(setTree, (e) => alert(e.message)); }, []);

  const mids = tree.find((c) => String(c.id) === catM)?.children || [];
  const subs = mids.find((c) => String(c.id) === catD)?.children || [];

  const moveSlide = (idx) => { setSlide(idx); window.scrollTo(0, 0); };

  const handleNextStep = () => {
    if (!catM || !catD || !catS) { alert('대단원, 중단원, 소단원을 모두 선택해주세요.'); return; }
    if (!title.trim()) { alert('강의 제목을 입력해주세요.'); return; }
    moveSlide(1);
  };

  // 게시글을 만든 뒤 슬라이드를 1번부터 차례로 올림 (사진·영상은 posts/<ID>/<번호>/ 폴더로 저장됨)
  const saveNewLecture = async () => {
    setSaving(true);
    let postId = null;
    // 진행률 = 지금까지 올린 사진·영상 용량 / 전체 용량 (글만 있는 슬라이드는 용량 0)
    const sizeOf = (s) => s.files.reduce((n, f) => n + f.size, 0);
    const total = slides.reduce((n, s) => n + sizeOf(s), 0);
    let done = 0;
    if (total) setProgress(0);
    try {
      const post = await api('/posts', {
        method: 'POST',
        body: formData({ title: title.trim(), description: description.trim(), categoryId: catS }),
      });
      postId = post.id;
      for (const [i, s] of slides.entries()) {
        const size = sizeOf(s);
        await api(`/posts/${postId}/slides/${i + 1}`, {
          method: 'PUT',
          body: formData({ text: s.text, files: s.files }),
          onProgress: total ? (loaded, all) => setProgress(Math.floor(((done + (size * loaded) / all) / total) * 100)) : undefined,
        });
        done += size;
      }
    } catch (e) {
      setSaving(false);
      setProgress(null);
      if (!postId) { alert(e.message); return; }
      await alert(`강의는 만들어졌지만 슬라이드 저장 중 문제가 생겼습니다: ${e.message}\n수정 화면에서 이어서 작업해 주세요.`);
      navigate(`/revise?id=${postId}`);
      return;
    }
    await alert('새로운 강의 목록 등록이 완벽하게 완료되었습니다!');
    navigate('/manager');
  };

  const saveSlide = (index, data) => {
    if (slides[index]?.thumbUrl) URL.revokeObjectURL(slides[index].thumbUrl);
    const next = [...slides];
    next[index] = withThumb(data);
    setSlides(next);
    setModal(null);
  };

  const deleteSlide = async (index) => {
    if (!(await confirm('해당 슬라이드를 삭제하시겠습니까?'))) return;
    if (slides[index].thumbUrl) URL.revokeObjectURL(slides[index].thumbUrl);
    setSlides(slides.filter((_, j) => j !== index));
  };

  // 슬라이드 앞/뒤로 옮기기 (등록 전이라 화면에서만 바꿈)
  const reorderSlide = (index, dir) => {
    const next = [...slides];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setSlides(next);
  };

  const editing = modal?.slide !== undefined ? modal.slide : null;

  return (
    <>
      <div className="viewport">
        <div className="slider-container" style={{ transform: `translateX(-${slide * 100}vw)` }}>

          {/* 1단계 페이지 */}
          <div className="page">
            <div className="header-iframe"><Header type="hidden" /></div>

            <main className="outer-card">
              <div className="form-card-panel">
                <div className="form-area">

                  {/* 강의가 들어갈 소단원 선택 (단원 자체는 [단원 관리]에서 만듦) */}
                  <div className="input-group">
                    <label>카테고리 선택</label>
                    <div className="select-group">
                      <select className="select-box" style={{ display: 'block' }} value={catM} onChange={(e) => { setCatM(e.target.value); setCatD(''); setCatS(''); }}>
                        <option value="">대단원 선택</option>
                        {tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select className="select-box" style={{ display: 'block' }} value={catD} onChange={(e) => { setCatD(e.target.value); setCatS(''); }}>
                        <option value="">중단원 선택</option>
                        {mids.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select className="select-box" style={{ display: 'block' }} value={catS} onChange={(e) => setCatS(e.target.value)}>
                        <option value="">소단원 선택</option>
                        {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
                      원하는 단원이 없으면 <Link to="/unit_manager" style={{ color: '#0056b3', fontWeight: 700 }}>단원 관리</Link>에서 먼저 만들어 주세요.
                    </div>
                  </div>

                  <div className="input-group">
                    <label>강의 제목</label>
                    <input type="text" className="text-input" placeholder="강의 제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  <LectureDescription value={description} onChange={setDescription} />
                </div>

                <div className="footer-nav">
                  <Link to="/manager" className="btn btn-back" onClick={cancelToList}>취소하고 목록으로</Link>
                  <button className="btn btn-next" onClick={handleNextStep} disabled={saving}>
                    다음 단계 (슬라이드 구성) <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </main>
          </div>

          {/* 2단계 페이지 (강의 목록 생성 전용) */}
          <div className="page">
            <div className="header-iframe"><Header type="hidden" /></div>

            <main className="outer-card">
              <div className="form-card-panel">
                <SlideGrid
                  slides={slides.map(summarize)}
                  onAddSlide={() => setModal({ slide: slides.length })}
                  onEditSlide={(i) => setModal({ slide: i })}
                  onDeleteSlide={deleteSlide}
                  onMoveSlide={reorderSlide}
                />
                <div className="footer-nav">
                  <button className="btn btn-back" onClick={() => moveSlide(0)}><i className="fa-solid fa-arrow-left"></i> 이전 단계로</button>
                  <button className="btn btn-next" style={{ background: '#10b981' }} onClick={saveNewLecture} disabled={saving}>
                    {saving ? `업로드 중...${progress === null ? '' : ` ${progress}%`}` : '새 강의 등록 완료'}
                  </button>
                </div>
              </div>
            </main>
          </div>

        </div>
      </div>

      {editing !== null && (
        <SlideModal
          no={editing + 1}
          initial={slides[editing]}
          edit={editing < slides.length}
          onClose={() => setModal(null)}
          onComplete={(data) => saveSlide(editing, data)}
        />
      )}
    </>
  );
}
