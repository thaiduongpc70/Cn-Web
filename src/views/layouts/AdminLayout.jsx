import React from 'react';
import { adminResourceGroups } from '../admin/AdminConfig.jsx';

export function AdminSidebar({ active, setActive }) {
  return (
    <aside className="admin-sidebar">
      <button className="brand" onClick={() => setActive('dashboard')}>
        <span className="icon-chip">B</span>
        BANTRASUA
      </button>
      <nav className="admin-nav">
        {adminResourceGroups.map((group) => {
          const isOpen = group.items.some(([key]) => key === active);

          return (
            <details className="admin-nav-group" key={group.title} open={isOpen}>
              <summary>
                <span>{group.title}</span>
                <small>{group.items.length}</small>
              </summary>
              <div className="admin-nav-items">
                {group.items.map(([key, icon, label]) => (
                  <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </details>
          );
        })}
      </nav>
    </aside>
  );
}

export function AdminTopbar({ user, setMode, onLogout, openPassword }) {
  return (
    <div className="admin-topbar">
      <button className="btn btn-outline" onClick={() => setMode('client')}>
        Xem website
      </button>
      <strong>Admin</strong>
      <button className="user-name-button admin-user-name" onClick={openPassword} title="Đổi mật khẩu">
        {user?.username}
      </button>
      <button className="btn btn-light" onClick={onLogout}>
        Đăng xuất
      </button>
    </div>
  );
}