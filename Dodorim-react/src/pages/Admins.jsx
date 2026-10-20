import { useEffect, useState } from 'react';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import usePage from '../usePage';
import { api, displayDate, setToken } from '../api';
import { alert, confirm } from '../dialog';
import { useMe } from '../me';
import '../styles/notice.css';

const hint = { fontSize: '13px', color: '#94a3b8', marginTop: '6px' };

/*
 * 관리자 계정
 * - 마스터(처음 만든 계정): 하위 관리자 계정 추가·수정(아이디·비밀번호 재설정)·삭제 + 내 비밀번호 변경
 * - 하위 관리자: 내 비밀번호 변경만
 * 모양은 공지사항 관리 화면과 같음 (notice.css)
 */
export default function Admins() {
  usePage('notice', '두드림 - 관리자 계정');
  const me = useMe();
  const [list, setList] = useState(null);
  // { mode: 'create' | 'edit' | 'self', id?, username, current, password, confirm } | null
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!me) return;
    if (me.master) api('/admins').then(setList, (e) => alert(e.message));
    else setList([me]);
  };
  useEffect(load, [me]);

  const open = (mode, item) => setForm({ mode, id: item?.id, username: item?.username || '', current: '', password: '', confirm: '' });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async () => {
    const username = form.username.trim();
    if (form.mode !== 'self' && !username) { alert('아이디를 입력해 주세요.'); return; }
    if (form.mode === 'self' && !form.current) { alert('현재 비밀번호를 입력해 주세요.'); return; }
    // 수정에서는 비밀번호를 비워 두면 그대로
    if (form.mode !== 'edit' || form.password) {
      if (form.password.length < 8) { alert('비밀번호는 8자 이상으로 입력해 주세요.'); return; }
      if (form.password !== form.confirm) { alert('비밀번호 확인이 일치하지 않습니다.'); return; }
    }
    setSaving(true);
    try {
      if (form.mode === 'create') {
        await api('/admins', { method: 'POST', body: { username, password: form.password } });
        alert(`관리자 계정 "${username}"을(를) 만들었습니다.`);
      } else if (form.mode === 'edit') {
        await api(`/admins/${form.id}`, { method: 'PUT', body: { username, ...(form.password && { password: form.password }) } });
        alert(form.password ? '저장했습니다. 이 계정은 새 비밀번호로 다시 로그인해야 합니다.' : '저장했습니다.');
      } else {
        const { token } = await api('/auth/password', { method: 'PUT', body: { currentPassword: form.current, newPassword: form.password } });
        setToken(token);
        alert('비밀번호를 바꿨습니다. 다른 기기에서는 다시 로그인해야 합니다.');
      }
      setForm(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!(await confirm(`관리자 계정 "${item.username}"을(를) 삭제하시겠습니까?\n이 계정으로 로그인한 화면은 바로 로그아웃됩니다.`))) return;
    try {
      await api(`/admins/${item.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const title = form && { create: '관리자 계정 추가', edit: '관리자 계정 수정', self: '내 비밀번호 변경' }[form.mode];

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
              <h1>관리자 계정</h1>
              <p>{me?.master ? '하위 관리자 계정을 추가·수정·삭제하고, 내 비밀번호를 바꿀 수 있습니다.' : '내 비밀번호를 바꿀 수 있습니다. 계정 추가·삭제는 마스터 계정에서 합니다.'}</p>
            </div>
          </section>

          {me?.master && (
            <div className="filter-section">
              <button className="add-btn" onClick={() => open('create')}>
                <i className="fa-solid fa-plus"></i> 관리자 추가
              </button>
            </div>
          )}

          <div className="content-list">
            {!me ? (
              <div className="empty-msg">서버에 연결할 수 없어 계정 정보를 불러오지 못했습니다.</div>
            ) : !list ? (
              <div className="empty-msg">데이터를 불러오는 중입니다...</div>
            ) : list.map((item) => {
              const mine = item.id === me.id;
              return (
                <div className="content-item" key={item.id}>
                  <div className="info">
                    <div className="info-top">
                      {item.master && <span className="new-badge">마스터</span>}
                      <h3>{item.username}{mine ? ' (나)' : ''}</h3>
                    </div>
                    {item.createdAt && <span className="category-path">{displayDate(item.createdAt)} 생성</span>}
                  </div>
                  <div className="actions">
                    {mine ? (
                      <button className="icon-btn edit-icon" onClick={() => open('self', item)} title="내 비밀번호 변경" aria-label="내 비밀번호 변경"><i className="fa-solid fa-key"></i></button>
                    ) : (
                      <>
                        <button className="icon-btn edit-icon" onClick={() => open('edit', item)} title="수정" aria-label={`${item.username} 수정`}><i className="fa-regular fa-pen-to-square"></i></button>
                        <button className="icon-btn delete-icon" onClick={() => remove(item)} title="삭제" aria-label={`${item.username} 삭제`}><i className="fa-regular fa-trash-can"></i></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <footer>
        <p>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</p>
      </footer>

      {form && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box" role="dialog" aria-modal="true" aria-label={title}>
            <h2>{title}</h2>
            {form.mode === 'self' ? (
              <div className="form-group">
                <label htmlFor="admin-current">현재 비밀번호</label>
                <input id="admin-current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} />
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="admin-username">아이디</label>
                <input id="admin-username" type="text" maxLength={50} autoComplete="off" placeholder="공백 없이 3자 이상" value={form.username} onChange={set('username')} />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="admin-password">{form.mode === 'create' ? '비밀번호' : '새 비밀번호'}</label>
              <input id="admin-password" type="password" autoComplete="new-password" placeholder="8자 이상" value={form.password} onChange={set('password')} />
              {form.mode === 'edit' && <div style={hint}>비워 두면 비밀번호는 그대로입니다. 바꾸면 이 계정은 다시 로그인해야 합니다.</div>}
            </div>
            <div className="form-group">
              <label htmlFor="admin-confirm">비밀번호 확인</label>
              <input id="admin-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
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
