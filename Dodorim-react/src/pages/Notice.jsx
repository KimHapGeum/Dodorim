import { useEffect, useState } from 'react';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import usePage from '../usePage';
import { api, displayDate, formData } from '../api';
import '../styles/notice.css';
import { alert, confirm } from '../dialog';

// 서버가 받는 첨부 형식 (Dodorim-server/src/storage.js 의 KINDS.attachment 와 같게)
const ATTACH_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp4,.webm,.mov,.m4v,.ogg,.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';

export default function Notice() {
  usePage('notice', '두드림 - 관리자 모드');
  const [notices, setNotices] = useState(null);
  const [keyword, setKeyword] = useState('');
  // { id, title, date, content, attachments: 서버에 있는 첨부 [{ name, url }], files: 새로 올릴 File[] } | null
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api('/notices').then(setNotices, (e) => alert(e.message));
  useEffect(() => { load(); }, []);

  const openForm = (id) => {
    if (id !== undefined) {
      const target = notices.find((item) => item.id === id);
      if (!target) return;
      setForm({ id, title: target.title, date: target.date, content: target.content, attachments: target.attachments, files: [] });
    } else {
      setForm({ id: null, title: '', date: new Date().toISOString().slice(0, 10), content: '', attachments: [], files: [] });
    }
  };

  const saveNotice = async () => {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !form.date || !content) {
      alert('제목, 날짜, 내용을 모두 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const body = formData({ title, date: form.date, content, files: form.files });
      if (form.id !== null) await api(`/notices/${form.id}`, { method: 'PUT', body });
      else await api('/notices', { method: 'POST', body });
      setForm(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 이미 올라간 첨부는 바로 삭제
  const deleteAttachment = async (name) => {
    if (!(await confirm(`첨부파일 "${name}"을(를) 삭제하시겠습니까?`))) return;
    try {
      await api(`/notices/${form.id}/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.name !== name) }));
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm('이 공지사항을 정말 삭제하시겠습니까?'))) return;
    try {
      await api(`/notices/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const kw = keyword.toLowerCase().trim();
  // 서버가 최신 날짜순으로 내려줌
  const filtered = (notices || []).filter((item) => !kw || item.title.toLowerCase().includes(kw));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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
              <h1>공지사항 관리</h1>
              <p>메인 화면 공지 배너에 표시되는 공지사항을 등록하고 관리하세요.</p>
            </div>
          </section>

          <div className="search-section">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" className="search-bar" placeholder="제목을 검색하세요..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>

          <div className="filter-section">
            <button className="add-btn" onClick={() => openForm()}>
              <i className="fa-solid fa-plus"></i> 신규 등록
            </button>
          </div>

          <div className="content-list">
            {!notices ? (
              <div className="empty-msg">데이터를 불러오는 중입니다...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-msg">
                {kw ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다. [신규 등록]을 눌러 공지를 추가해 주세요.'}
              </div>
            ) : filtered.map((item, index) => (
              <div className="content-item" key={item.id}>
                <div className="info">
                  <div className="info-top">
                    {index === 0 && !kw && <span className="new-badge">NEW</span>}
                    <h3>{item.title}</h3>
                  </div>
                  <span className="category-path">{displayDate(item.date)}</span>
                </div>
                <div className="actions">
                  <button className="icon-btn edit-icon" onClick={() => openForm(item.id)}><i className="fa-regular fa-pen-to-square"></i></button>
                  <button className="icon-btn delete-icon" onClick={() => handleDelete(item.id)}><i className="fa-regular fa-trash-can"></i></button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer>
        <p>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</p>
      </footer>

      {/* 등록/수정 모달 */}
      {form && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box">
            <h2>{form.id !== null ? '공지사항 수정' : '공지사항 등록'}</h2>
            <div className="form-group">
              <label>제목</label>
              <input type="text" placeholder="공지 제목을 입력하세요" value={form.title} onChange={set('title')} />
            </div>
            <div className="form-group">
              <label>날짜</label>
              <input type="date" value={form.date} onChange={set('date')} />
            </div>
            <div className="form-group">
              <label>내용</label>
              <textarea placeholder="공지 내용을 입력하세요" value={form.content} onChange={set('content')}></textarea>
            </div>
            <div className="form-group">
              <label>첨부파일 (선택, 여러 개 가능)</label>
              <input type="file" multiple accept={ATTACH_ACCEPT} onChange={(e) => { const picked = [...e.target.files]; e.target.value = ''; setForm((f) => ({ ...f, files: [...f.files, ...picked] })); }} />
              {(form.attachments.length > 0 || form.files.length > 0) && (
                <ul className="attach-list">
                  {form.attachments.map((a) => (
                    <li key={a.url}>
                      <a href={a.url} target="_blank" rel="noreferrer"><i className="fa-solid fa-paperclip"></i> {a.name}</a>
                      <button type="button" onClick={() => deleteAttachment(a.name)} aria-label={`${a.name} 삭제`}><i className="fa-solid fa-xmark"></i></button>
                    </li>
                  ))}
                  {form.files.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <span><i className="fa-solid fa-paperclip"></i> {f.name} <em>(저장하면 올라감)</em></span>
                      <button type="button" onClick={() => setForm((x) => ({ ...x, files: x.files.filter((_, j) => j !== i) }))} aria-label={`${f.name} 빼기`}><i className="fa-solid fa-xmark"></i></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setForm(null)}>취소</button>
              <button className="btn-save" onClick={saveNotice} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
