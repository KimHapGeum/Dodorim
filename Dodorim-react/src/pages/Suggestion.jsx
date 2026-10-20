import { useEffect, useState } from 'react';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import usePage from '../usePage';
import { api, displayDate } from '../api';
import '../styles/suggestion.css';
import { alert, confirm } from '../dialog';
import { clickable } from '../a11y';

export default function Suggestion() {
  usePage('suggestion', '두드림 - 건의사항 관리');
  const [all, setAll] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [statusVal, setStatusVal] = useState('');
  const [sortVal, setSortVal] = useState('latest');
  const [expanded, setExpanded] = useState({});

  const load = () => api('/suggestions').then((d) => setAll(d.items), (e) => alert(e.message));
  useEffect(() => { load(); }, []);

  const handleToggleDone = async (e, item) => {
    e.stopPropagation();
    try {
      await api(`/suggestions/${item.id}`, { method: 'PATCH', body: { status: item.status === 'done' ? 'pending' : 'done' } });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!(await confirm('이 건의사항을 정말 삭제하시겠습니까?'))) return;
    try {
      await api(`/suggestions/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const kw = keyword.toLowerCase();
  let list = [...(all || [])].sort((a, b) => (sortVal === 'latest' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));
  if (statusVal) list = list.filter((item) => item.status === statusVal);
  if (kw) list = list.filter((item) => item.content.toLowerCase().includes(kw));
  const pendingCount = (all || []).filter((i) => i.status === 'pending').length;

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
              <h1>건의사항 관리</h1>
              <p>사용자가 남긴 건의사항을 확인하고 처리하세요.</p>
            </div>
          </section>

          <div className="search-section">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" className="search-bar" placeholder="건의 내용으로 검색하세요..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>

          <div className="filter-section">
            <div className="select-group">
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                <option value="">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="done">처리완료</option>
              </select>
              <select value={sortVal} onChange={(e) => setSortVal(e.target.value)}>
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
              </select>
            </div>
            <div className="stat-badge">{`전체 ${(all || []).length}건 · 대기중 ${pendingCount}건`}</div>
          </div>

          <div className="content-list">
            {!all ? (
              <div className="empty-msg">데이터를 불러오는 중입니다...</div>
            ) : list.length === 0 ? (
              <div className="empty-msg">조건에 맞는 건의사항이 없습니다.</div>
            ) : list.map((item) => (
              <div
                key={item.id}
                className={`content-item ${expanded[item.id] ? 'expanded' : ''}`}
                {...clickable(() => setExpanded((x) => ({ ...x, [item.id]: !x[item.id] })))}
                aria-expanded={!!expanded[item.id]}
              >
                <div className="info">
                  <div className="info-top">
                    <span className={`status-badge ${item.status}`}>{item.status === 'done' ? '처리완료' : '대기중'}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className="meta">{displayDate(item.date)}</div>
                  <div className="detail-content">{item.content}</div>
                </div>
                <div className="actions">
                  <button className="icon-btn done-icon" title="처리완료로 표시" onClick={(e) => handleToggleDone(e, item)}><i className="fa-solid fa-check"></i></button>
                  <button className="icon-btn delete-icon" title="삭제" onClick={(e) => handleDelete(e, item.id)}><i className="fa-regular fa-trash-can"></i></button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer>
        <p>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</p>
      </footer>
    </>
  );
}
