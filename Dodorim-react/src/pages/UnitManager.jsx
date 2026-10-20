import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import usePage from '../usePage';
import { api, formData, IMAGE_MAX_MB, tooBigImage } from '../api';
import { flat, UNIT_DESC_MAX } from '../categories';
import '../styles/unit_manager.css';
import { alert, confirm } from '../dialog';
import { clickable } from '../a11y';

const LEVELS = { 1: '대단원', 2: '중단원', 3: '소단원' };

/*
 * 단원 관리: 대단원 > 중단원 > 소단원을 폴더처럼 펼쳐 보며 추가·수정·삭제.
 * 단원은 학습자 선택 화면(주제 선택 → 중단원 → 소단원) 카드로 그대로 나타남
 */
export default function UnitManager() {
  usePage('unit_manager', '두드림 - 관리자 모드');
  const [tree, setTree] = useState(null);
  const [postCount, setPostCount] = useState({}); // 소단원 id → 강의 수
  const [open, setOpen] = useState({}); // 폴더 id → 펼침 여부 (기본: 대단원만 펼침)
  // { id?, parent?: 상위 단원(추가할 때), parentId?: 상위 단원 id(수정할 때, 바꾸면 옮김), depth, name, description, icon(File), iconUrl }
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = () => Promise.all([api('/categories'), api('/posts')])
    .then(([t, posts]) => {
      setTree(t);
      const count = {};
      for (const p of posts) count[p.categoryId] = (count[p.categoryId] || 0) + 1;
      setPostCount(count);
    })
    .catch((e) => alert(e.message));
  useEffect(() => { load(); }, []);

  const preview = useMemo(() => (form?.icon ? URL.createObjectURL(form.icon) : null), [form?.icon]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const isOpen = (c) => open[c.id] ?? c.depth === 1;
  const toggle = (c) => setOpen((o) => ({ ...o, [c.id]: !isOpen(c) }));
  // 하위 단원 전체의 강의 수
  const lectures = (c) => flat([c]).reduce((n, x) => n + (postCount[x.id] || 0), 0);

  const openAdd = (parent) => setForm({ parent, depth: parent ? parent.depth + 1 : 1, name: '', description: '', icon: null, iconUrl: null });
  const openEdit = (c) => setForm({ id: c.id, parentId: c.parentId, depth: c.depth, name: c.name, description: c.description || '', icon: null, iconUrl: c.iconUrl });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // 옮길 수 있는 상위 단원: 중단원 → 대단원들, 소단원 → 중단원들("대단원 > 중단원")
  const parentOptions = (depth) => (depth === 2
    ? tree.map((m) => [m.id, m.name])
    : tree.flatMap((m) => m.children.map((d) => [d.id, `${m.name} > ${d.name}`])));

  // 같은 상위 단원 안에서 한 칸 위/아래로
  const reorder = async (siblings, index, dir) => {
    const ids = siblings.map((s) => s.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    try {
      await api('/categories/order', { method: 'PUT', body: { ids } });
    } catch (e) {
      alert(e.message);
    }
    await load();
  };

  const pickIcon = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드할 수 있습니다.'); return; }
    if (tooBigImage(file)) { alert(`사진 용량이 너무 큽니다. ${IMAGE_MAX_MB}MB 이하의 사진을 선택해 주세요.`); return; }
    setForm({ ...form, icon: file });
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) { alert('단원 이름을 입력해 주세요.'); return; }
    setSaving(true);
    try {
      const body = formData({ name, description: form.description.trim(), icon: form.icon, parentId: form.id ? form.parentId ?? undefined : form.parent?.id });
      if (form.id) await api(`/categories/${form.id}`, { method: 'PUT', body });
      else await api('/categories', { method: 'POST', body });
      const parentId = form.parent?.id ?? form.parentId;
      if (parentId) setOpen((o) => ({ ...o, [parentId]: true })); // 추가·옮긴 단원이 보이도록 상위 폴더 펼침
      setForm(null);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    const n = lectures(c);
    if (n > 0) {
      alert(`"${c.name}"${c.depth < 3 ? ' (하위 단원 포함)' : ''}에 강의가 ${n}개 있어 삭제할 수 없습니다.\n강의 목록 관리에서 강의를 먼저 삭제하거나 다른 단원으로 옮겨 주세요.`);
      return;
    }
    const children = flat(c.children).length;
    const msg = `${LEVELS[c.depth]} "${c.name}"을(를) 삭제하시겠습니까?${children ? `\n하위 단원 ${children}개도 함께 삭제됩니다.` : ''}`;
    if (!(await confirm(msg))) return;
    try {
      await api(`/categories/${c.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const renderUnit = (c, index, siblings) => {
    const hasChildren = c.children.length > 0;
    const n = lectures(c);
    return (
      <div key={c.id} className="unit-node">
        <div className="unit-row">
          <button className="unit-toggle" disabled={!hasChildren} onClick={() => toggle(c)} aria-label={isOpen(c) ? '접기' : '펼치기'}>
            <i className={`fa-solid fa-chevron-${isOpen(c) ? 'down' : 'right'}`}></i>
          </button>
          <i className={`unit-folder fa-solid ${c.depth === 3 ? 'fa-file-lines sub' : isOpen(c) && hasChildren ? 'fa-folder-open' : 'fa-folder'}`}></i>
          {c.iconUrl && <img className="unit-thumb" src={c.iconUrl} alt="" />}
          <div className="unit-info">
            <h3>
              {c.name}
              <span className="unit-level">{LEVELS[c.depth]}</span>
              <span className="category-path">
                {c.depth < 3 ? `${LEVELS[c.depth + 1]} ${c.children.length}개 · ` : ''}강의 {n}개
              </span>
            </h3>
            {c.description && <p>{c.description}</p>}
          </div>
          <div className="unit-actions">
            <button className="icon-btn order-icon" disabled={index === 0} onClick={() => reorder(siblings, index, -1)} title="위로" aria-label={`${c.name} 위로`}><i className="fa-solid fa-arrow-up"></i></button>
            <button className="icon-btn order-icon" disabled={index === siblings.length - 1} onClick={() => reorder(siblings, index, 1)} title="아래로" aria-label={`${c.name} 아래로`}><i className="fa-solid fa-arrow-down"></i></button>
            {c.depth < 3 && <button className="unit-add" onClick={() => openAdd(c)}><i className="fa-solid fa-plus"></i> {LEVELS[c.depth + 1]}</button>}
            <button className="icon-btn edit-icon" onClick={() => openEdit(c)} title="수정"><i className="fa-regular fa-pen-to-square"></i></button>
            <button className="icon-btn delete-icon" onClick={() => remove(c)} title="삭제"><i className="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
        {hasChildren && isOpen(c) && <div className="unit-children">{c.children.map(renderUnit)}</div>}
      </div>
    );
  };

  const level = form && LEVELS[form.depth];

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
              <h1>단원 관리</h1>
              <p>대단원 · 중단원 · 소단원을 폴더처럼 관리하세요. 단원은 학습자 선택 화면에 카드로 표시됩니다.</p>
            </div>
          </section>

          <div className="filter-section">
            <button className="add-btn" onClick={() => openAdd(null)}>
              <i className="fa-solid fa-plus"></i> 대단원 추가
            </button>
          </div>

          <div className="unit-tree">
            {!tree && <div className="empty-msg">데이터를 불러오는 중입니다...</div>}
            {tree && tree.length === 0 && <div className="empty-msg">등록된 단원이 없습니다. [대단원 추가]로 시작해 주세요.</div>}
            {tree?.map(renderUnit)}
          </div>
        </main>
      </div>

      {form && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box">
            <h2>{form.id ? `${level} 수정` : `${level} 추가`}</h2>
            {form.parent && <div className="form-group"><label>상위 단원</label><div className="category-path">{form.parent.name}</div></div>}
            {form.id && form.depth > 1 && (
              <div className="form-group">
                <label htmlFor="unit-parent">상위 단원 (바꾸면 그 아래로 옮겨집니다)</label>
                <select id="unit-parent" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: Number(e.target.value) })}>
                  {parentOptions(form.depth).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>단원 이름</label>
              <input type="text" maxLength={100} placeholder={`${level} 이름`} value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label>
                설명 (선택)
                <span className={`char-count${form.description.length >= UNIT_DESC_MAX ? ' full' : ''}`}>{form.description.length}/{UNIT_DESC_MAX}자, 2줄까지</span>
              </label>
              {/* 선택 화면 카드에 2줄까지만 보이므로 줄바꿈은 1번까지 */}
              <textarea
                style={{ minHeight: '80px' }}
                maxLength={UNIT_DESC_MAX}
                placeholder="선택 화면 카드에 보일 짧은 설명"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.split('\n').slice(0, 2).join('\n') })}
              ></textarea>
            </div>
            <div className="form-group">
              <label>아이콘 이미지 (선택{form.id && form.iconUrl ? ', 누르면 교체' : ''})</label>
              <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={pickIcon} />
              <div className="icon-preview" {...clickable(() => fileRef.current.click())} aria-label="아이콘 이미지 선택">
                {preview || form.iconUrl ? <img src={preview || form.iconUrl} alt="" /> : <i className="fa-solid fa-plus" style={{ fontSize: '22px', color: '#cbd5e1' }}></i>}
              </div>
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setForm(null)}>취소</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
