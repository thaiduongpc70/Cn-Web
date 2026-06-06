import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import { ClientApp } from './clientApp.jsx';
import { AdminApp } from '../../src/views/admin/AdminApp.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('client');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  function notify(message) {
    setToast(message);
    window.clearTimeout(window.__bantrasuaToast);
    window.__bantrasuaToast = window.setTimeout(() => setToast(''), 3200);
  }

  async function refreshUser() {
    const result = await api.auth.me();
    setUser(result.user);
    if (result.user?.role_name === 'Admin') {
      setMode('admin');
    }
    return result.user;
  }

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role_name === 'Admin') {
      setMode('admin');
    }
  }, [user?.id]);

  if (loading) {
    return <div className="loading">Đang khởi động BANTRASUA...</div>;
  }

  return (
    <>
      {mode === 'admin' && user?.role_name === 'Admin' ? (
        <AdminApp user={user} setUser={setUser} setMode={setMode} notify={notify} />
      ) : (
        <ClientApp user={user} setUser={setUser} refreshUser={refreshUser} setMode={setMode} notify={notify} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
