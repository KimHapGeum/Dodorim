import { useLocation, useNavigate } from 'react-router-dom';

const menus = [
  ['/manager', 'fa-book-open', '강의 목록 관리'],
  ['/unit_manager', 'fa-folder-tree', '단원 관리'],
  ['/notice', 'fa-bullhorn', '공지사항 관리'],
  ['/suggestion', 'fa-comments', '건의사항 관리'],
  ['/banner', 'fa-image', '배너 관리'],
  ['/admins', 'fa-user-shield', '관리자 계정'],
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-title">관리자 메뉴</div>
      {menus.map(([to, icon, label]) => (
        <button key={to} className={`menu-btn${pathname === to ? ' active' : ''}`} onClick={() => navigate(to)}>
          <i className={`fa-solid ${icon}`}></i> {label}
        </button>
      ))}
    </aside>
  );
}
