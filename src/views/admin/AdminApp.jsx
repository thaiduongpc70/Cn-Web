import React, { useEffect, useState } from 'react';
import { api } from '../../../client/src/api.js';
import { PasswordModal } from '../../../client/src/PasswordModal.jsx';
import { AdminSidebar, AdminTopbar } from '../layouts/AdminLayout.jsx';
import { Dashboard } from './statistics/Dashboard.jsx';
import { ResourceView } from './AdminResourceView.jsx';

export function AdminApp({ user, setUser, setMode, notify }) {
  const [active, setActive] = useState('dashboard');
  const [meta, setMeta] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    api.admin.meta().then(setMeta).catch((error) => notify(error.message));
  }, []);

  async function logout() {
    try {
      await api.auth.logout();
      setUser(null);
      setMode('client');
      notify('Đã đăng xuất.');
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <div className="admin-app app-shell">
      <AdminSidebar active={active} setActive={setActive} />
      <main className="admin-content">
        <AdminTopbar user={user} setMode={setMode} onLogout={logout} openPassword={() => setPasswordOpen(true)} />
        {active === 'dashboard' ? (
          <Dashboard notify={notify} />
        ) : meta ? (
          <ResourceView active={active} meta={meta} notify={notify} />
        ) : (
          <div className="loading">Đang tải metadata...</div>
        )}
      </main>
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} notify={notify} />}
    </div>
  );
}