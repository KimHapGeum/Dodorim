import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import usePage from '../usePage';
import { api } from '../api';
import '../styles/manager.css';
import { alert, confirm } from '../dialog';
import { clickable } from '../a11y';

const field = (post) => ({ ...post.category, title: post.title, id: post.id });
const byName = (list, name) => list?.find((c) => c.name === name);

export default function Manager() {
  usePage('manager', '두드림 - 관리자 모드');
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [lectures, setLectures] = useState(null);
  const [mainVal, setMainVal] = useState('');
  const [midVal, setMidVal] = useState('');
  const [subVal, setSubVal] = useState('');
  const [keyword, setKeyword] = useState('');
  // 그룹별로 사용자가 펼침 상태를 뒤집었는지 기록 (필터가 바뀌면 초기화)
  const [toggled, setToggled] = useState({});

  const changeFilter = (setter) => (e) => { setter(e.target.value); setToggled({}); };

  const load = () => Promise.all([api('/categories'), api('/posts')])
    .then(([t, posts]) => { setTree(t); setLectures(posts); })
    .catch((e) => alert(e.message));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!(await confirm('이 항목을 정말 삭제하시겠습니까?'))) return;
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      alert('삭제되었습니다.');
      setToggled({});
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const kw = keyword.toLowerCase().trim();
  const defaultActive = !!(mainVal || midVal || subVal || kw);

  const groups = [];
  (mainVal ? [mainVal] : tree.map((c) => c.name)).forEach((mainName) => {
    const midList = byName(tree, mainName)?.children || [];
    // 중단원이 아직 없는 대단원도 목록에 보이도록
    if (!midVal && midList.length === 0) {
      if (!kw) groups.push({ key: mainName, items: [] });
      return;
    }
    (midVal ? [midVal] : midList.map((c) => c.name)).forEach((midName) => {
      const items = (lectures || []).map(field).filter((f) => {
        if (f.main !== mainName || f.mid !== midName) return false;
        if (subVal && f.sub !== subVal) return false;
        if (kw && !f.title.toLowerCase().includes(kw)) return false;
        return true;
      });
      if ((mainVal || midVal) && items.length === 0 && !kw) return;
      groups.push({ key: `${mainName} > ${midName}`, items });
    });
  });

  let body;
  if (!lectures) {
    body = <div className="root-empty">데이터를 불러오는 중입니다...</div>;
  } else if (tree.length === 0) {
    body = <div className="root-empty">저장된 데이터가 없습니다. 우측 상단의 [신규 등록]을 통해 단원이나 강의를 추가해 주세요.</div>;
  } else if (groups.length === 0) {
    body = <div className="root-empty">선택한 조건에 일치하는 항목이 없습니다.</div>;
  } else {
    body = groups.map(({ key, items }) => (
      <div className="category-group" key={key}>
        <div
          className={`category-header ${defaultActive !== !!toggled[key] ? 'active' : ''}`}
          {...clickable(() => setToggled((t) => ({ ...t, [key]: !t[key] })))}
          aria-expanded={defaultActive !== !!toggled[key]}
        >
          <div className="category-title-area">
            <h2>{key}</h2>
            <span className="count-badge">{items.length}개</span>
          </div>
          <i className="fa-solid fa-chevron-down toggle-icon"></i>
        </div>
        <div className="category-body">
          {items.length > 0 ? items.map((f, i) => {
            const path = [f.mid, f.sub].filter(Boolean).join(' > ');
            return (
              <div className="content-item" key={`${f.id}-${i}`}>
                <div className="info">
                  <h3>{f.title || '제목 없음'}</h3>
                  <div className="category-path">{path || '하위 분류 없음'}</div>
                </div>
                <div className="actions">
                  <button className="icon-btn edit-icon" onClick={() => navigate(`/revise?id=${f.id}`)} title="수정"><i className="fa-regular fa-pen-to-square"></i></button>
                  <button className="icon-btn delete-icon" onClick={() => handleDelete(f.id)} title="삭제"><i className="fa-regular fa-trash-can"></i></button>
                </div>
              </div>
            );
          }) : <div className="empty-msg">등록된 항목이 없습니다.</div>}
        </div>
      </div>
    ));
  }

  return (
    <>
      <div id="main-header-wrapper">
        <Header type="manager" />
      </div>

      <div className="admin-container">
        <AdminSidebar />

        <main className="main-content">
          <section className="title-section">
            <div className="text-group">
              <h1>강의 목록 관리</h1>
              <p>등록된 교육 콘텐츠 및 단원을 카테고리별로 관리하세요.</p>
            </div>
          </section>

          <div className="search-section">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" className="search-bar" placeholder="항목명을 검색하세요..." value={keyword} onChange={changeFilter(setKeyword)} />
          </div>

          {/* 대단원 / 중단원 / 소단원 드롭다운 */}
          <div className="filter-section">
            <div className="select-group">
              <select value={mainVal} onChange={(e) => { changeFilter(setMainVal)(e); setMidVal(''); setSubVal(''); }}>
                <option value="">전체 대단원 선택</option>
                {tree.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={midVal} onChange={(e) => { changeFilter(setMidVal)(e); setSubVal(''); }}>
                <option value="">중단원 선택</option>
                {byName(tree, mainVal)?.children.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={subVal} onChange={changeFilter(setSubVal)}>
                <option value="">소단원 선택</option>
                {byName(byName(tree, mainVal)?.children, midVal)?.children.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <button className="add-btn" onClick={() => navigate('/addition')}>
              <i className="fa-solid fa-plus"></i> 신규 강의 등록
            </button>
          </div>

          <div id="categoryGroupContainer">{body}</div>
        </main>
      </div>

      <footer>
        <p>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</p>
      </footer>
    </>
  );
}
