import React, { useState } from 'react';
import { api } from '../../../client/src/api.js';
import { classNames, money } from '../../../client/src/utils.js';

const fallbackImage =
  'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=80';

export { fallbackImage };

function buildQrPattern(text) {
  let hash = 0;
  const source = text || 'T';
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) >>> 0;
  }

  return Array.from({ length: 21 }, (_, y) => (
    Array.from({ length: 21 }, (_, x) => {
      const inFinder =
        (x < 7 && y < 7)
        || (x > 13 && y < 7)
        || (x < 7 && y > 13);
      if (inFinder) {
        const lx = x < 7 ? x : x - 14;
        const ly = y < 7 ? y : y - 14;
        return lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
      }
      return ((hash + x * 17 + y * 29 + x * y * 7) % 5) < 2;
    })
  ));
}

export function PaymentQr({ method, amount }) {
  const payload = `BANTRASUA|${method}|${Math.round(Number(amount || 0))}`;
  const pattern = buildQrPattern(payload);

  return (
    <div className="payment-qr">
      <svg viewBox="0 0 21 21" role="img" aria-label="Mã QR thanh toán">
        <rect width="21" height="21" fill="#fff" />
        {pattern.map((row, y) => row.map((filled, x) => (
          filled ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#123024" /> : null
        )))}
      </svg>
      <div>
        <strong>Quét QR để thanh toán</strong>
        <span>{method} - {money(amount)}</span>
        <small>Nội dung: BANTRASUA {method}</small>
      </div>
    </div>
  );
}

export function ClientHeader({ user, view, setView, cartCount, onLogout, openAuth, openPassword, openDashboard }) {
  return (
    <header className="client-header">
      <nav className="client-nav">
        <button className="brand" onClick={() => setView('home')}>
          <span className="icon-chip">B</span>
          BANTRASUA
        </button>
        <div className="client-menu">
          {[
            ['home', 'Trang chủ'],
            ['menu', 'Menu'],
            ['content', 'Tin tức & Cửa hàng'],
            ['orders', 'Đơn hàng'],
            ['profile', 'Hội viên']
          ].map(([key, label]) => (
            <button key={key} className={classNames(view === key && 'active')} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="client-user">
          {user ? (
            <>
              <button className="user-name-button" onClick={openPassword} title="Đổi mật khẩu">
                {user.username}
              </button>
              {user.role_name === 'Admin' && (
                <button className="dashboard-button" onClick={openDashboard}>
                  Dashboard
                </button>
              )}
              <button className="btn btn-light" onClick={onLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={openAuth}>
              Đăng nhập
            </button>
          )}
          <button className="cart-button" onClick={() => setView('cart')} title="Giỏ hàng">
            <span className="cart-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M7 18.5a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm10 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM4.1 4.5l1.9 9.6c.2 1 1.1 1.8 2.2 1.8h8.9c1 0 1.9-.7 2.2-1.7l1.2-5.1H7.1L6.5 6H3.2V4.5h.9Z" />
              </svg>
            </span>
            {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
          </button>
        </div>
      </nav>
    </header>
  );
}

export function AuthModal({ onClose, onSuccess, notify }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    address: ''
  });

  async function submit(event) {
    event.preventDefault();
    try {
      const result = mode === 'login' ? await api.auth.login(form) : await api.auth.register(form);
      notify(mode === 'login' ? 'Đăng nhập thành công.' : 'Đăng ký thành công.');
      onSuccess(result.user);
      onClose();
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
          <button type="button" className="btn btn-light btn-small" onClick={onClose}>
            Đóng
          </button>
        </div>
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={classNames('tab-btn', mode === 'login' && 'active')} onClick={() => setMode('login')}>
            Đăng nhập
          </button>
          <button type="button" className={classNames('tab-btn', mode === 'register' && 'active')} onClick={() => setMode('register')}>
            Đăng ký
          </button>
        </div>
        <div className="form-grid">
          <label className="field wide">
            <span>Tài khoản</span>
            <input className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label className="field wide">
            <span>Mật khẩu</span>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          {mode === 'register' && (
            <>
              <label className="field wide">
                <span>Họ tên</span>
                <input className="input" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
              </label>
              <label className="field">
                <span>Email</span>
                <input className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className="field">
                <span>Số điện thoại</span>
                <input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
              <label className="field wide">
                <span>Địa chỉ</span>
                <textarea className="textarea" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </label>
            </>
          )}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }}>
          {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </button>
      </form>
    </div>
  );
}

