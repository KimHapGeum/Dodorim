import { useEffect, useState } from 'react';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import usePage from '../usePage';
import { api, formData, IMAGE_MAX_MB, tooBigImage } from '../api';
import '../styles/banner.css';
import { alert, confirm } from '../dialog';

// 메인 화면 슬라이더 배너. 목록 순서 = 슬라이더 노출 순서. 등록된 배너가 없으면 메인 화면은 기본 배너 3개를 보여줌
export default function Banner() {
  usePage('banner', '두드림 - 관리자 모드');
  const [banners, setBanners] = useState(null);
  const [form, setForm] = useState(null); // { id, title, desc, file, color, subColor, hint } | null

  const load = () => api('/banners').then(setBanners, (e) => alert(e.message));
  useEffect(() => { load(); }, []);

  // 요청 실패 시 메시지를 보여주고, 끝나면 목록을 다시 불러옴
  const run = async (fn) => {
    try {
      await fn();
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    } finally {
      load();
    }
  };

  const resetToDefault = async () => {
    if (!(await confirm('등록한 배너를 모두 지우고, 처음 기본 배너 3개로 되돌리시겠습니까?'))) return;
    run(async () => { for (const b of banners) await api(`/banners/${b.id}`, { method: 'DELETE' }); });
  };

  const moveItem = (id, direction) => {
    const ids = banners.map((b) => b.id);
    const idx = ids.indexOf(id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ids.length) return;
    [ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]];
    run(() => api('/banners/order', { method: 'PUT', body: { ids } }));
  };

  const openForm = (id) => {
    if (id !== undefined) {
      const t = banners.find((item) => item.id === id);
      if (!t) return;
      setForm({
        id, title: t.title, desc: t.desc, file: null, color: t.color, subColor: t.subColor,
        hint: `새 이미지를 선택하지 않으면 현재 이미지(${t.imgName})가 유지됩니다.`,
      });
    } else {
      setForm({ id: null, title: '', desc: '', file: null, color: '#0056b3', subColor: '#a5c0e4', hint: '이미지 파일을 선택해 주세요.' });
    }
  };

  const saveBanner = async () => {
    const title = form.title.trim();
    const desc = form.desc.trim();
    const { file, color, subColor } = form;
    if (!title || !desc || (form.id === null && !file)) {
      alert('제목, 설명, 이미지 파일을 모두 입력해 주세요.');
      return;
    }
    const body = formData({ title, desc, color, subColor, image: file });
    const ok = await run(() => (form.id !== null
      ? api(`/banners/${form.id}`, { method: 'PUT', body })
      : api('/banners', { method: 'POST', body })));
    if (ok) setForm(null);
  };

  const handleDelete = async (id) => {
    if (await confirm('이 배너를 정말 삭제하시겠습니까?')) run(() => api(`/banners/${id}`, { method: 'DELETE' }));
  };

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
              <h1>배너 관리</h1>
              <p>메인 화면 상단 슬라이더에 표시되는 배너를 등록하고 순서를 관리하세요.</p>
            </div>
          </section>

          <div className="filter-section">
            <span className="hint">목록 순서가 실제 메인 화면 슬라이더 순서와 동일합니다.</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="add-btn reset-btn" onClick={resetToDefault}>
                <i className="fa-solid fa-rotate-left"></i> 기본 3개로 초기화
              </button>
              <button className="add-btn" onClick={() => openForm()}>
                <i className="fa-solid fa-plus"></i> 신규 등록
              </button>
            </div>
          </div>

          <div className="content-list">
            {!banners ? (
              <div className="empty-msg">데이터를 불러오는 중입니다...</div>
            ) : banners.length === 0 ? (
              <div className="empty-msg">등록된 배너가 없어 메인 화면에는 기본 배너 3개가 보입니다. [신규 등록]을 눌러 배너를 추가해 주세요.</div>
            ) : banners.map((item, index) => (
              <div className="content-item" key={item.id}>
                <div className="swatch" style={{ background: item.color }}></div>
                <div className="info">
                  <span className="order-badge">{index + 1}번째 슬라이드</span>
                  <h3>{item.title}</h3>
                  <span className="category-path">{item.imgName}</span>
                </div>
                <div className="actions">
                  <button className="icon-btn order-icon" disabled={index === 0} onClick={() => moveItem(item.id, -1)}><i className="fa-solid fa-arrow-up"></i></button>
                  <button className="icon-btn order-icon" disabled={index === banners.length - 1} onClick={() => moveItem(item.id, 1)}><i className="fa-solid fa-arrow-down"></i></button>
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
            <h2>{form.id !== null ? '배너 수정' : '배너 등록'}</h2>
            <div className="form-group">
              <label>제목</label>
              <input type="text" placeholder="배너에 표시될 제목" value={form.title} onChange={set('title')} />
            </div>
            <div className="form-group">
              <label>설명</label>
              <textarea placeholder="배너 설명 문구 (줄바꿈 가능)" value={form.desc} onChange={set('desc')}></textarea>
            </div>
            <div className="form-group">
              <label>배너 이미지 파일</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0] || null;
                  if (file && tooBigImage(file)) { alert(`사진 용량이 너무 큽니다. ${IMAGE_MAX_MB}MB 이하의 사진을 선택해 주세요.`); e.target.value = ''; return; }
                  setForm({ ...form, file });
                }}
              />
              <div className="form-hint">{form.hint}</div>
            </div>
            <div className="color-row">
              <div className="form-group">
                <label>메인 색상 (버튼/배경)</label>
                <input type="color" value={form.color} onChange={set('color')} />
              </div>
              <div className="form-group">
                <label>보조 색상 (체험하기 버튼)</label>
                <input type="color" value={form.subColor} onChange={set('subColor')} />
              </div>
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setForm(null)}>취소</button>
              <button className="btn-save" onClick={saveBanner}>저장</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
