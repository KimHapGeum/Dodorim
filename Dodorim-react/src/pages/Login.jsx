import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import usePage from '../usePage';
import { api, setToken } from '../api';
import '../styles/login.css';
import { alert } from '../dialog';

export default function Login() {
  usePage('login', '두드림 - 로그인');
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: { username: e.target.elements.username.value, password: e.target.elements.password.value } });
      setToken(token);
      navigate('/manager');
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="header-wrapper">
        <Header type="hidden" />
      </div>

      <main className="login-main-section">
        <div className="login-container">
          <h2 className="welcome-text">관리자 로그인</h2>
          <form onSubmit={login}>
            <div className="input-section">
              <label className="input-label">아이디</label>
              <input type="text" id="id" name="username" placeholder="아이디를 입력하세요" required />
            </div>
            <div className="input-section">
              <label className="input-label">비밀번호</label>
              <input type="password" id="password" name="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-login" disabled={busy}>로그인</button>
          </form>
        </div>
      </main>

      <footer className="main-footer">
        <p>© 2026 두드림. 모든 시니어의 디지털 자립을 응원합니다.</p>
      </footer>
    </div>
  );
}
