import React, { useState } from 'react';
import { api } from './api.js';

export function PasswordModal({ onClose, notify }) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  async function submit(event) {
    event.preventDefault();
    try {
      const result = await api.auth.changePassword(form);
      notify(result.message || 'Đã đổi mật khẩu.');
      onClose();
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>Đổi mật khẩu</h2>
          <button type="button" className="btn btn-light btn-small" onClick={onClose}>
            Đóng
          </button>
        </div>
        <div className="form-grid">
          <label className="field wide">
            <span>Mật khẩu hiện tại</span>
            <input
              className="input"
              type="password"
              value={form.current_password}
              onChange={(event) => setForm({ ...form, current_password: event.target.value })}
            />
          </label>
          <label className="field wide">
            <span>Mật khẩu mới</span>
            <input
              className="input"
              type="password"
              value={form.new_password}
              onChange={(event) => setForm({ ...form, new_password: event.target.value })}
            />
          </label>
          <label className="field wide">
            <span>Nhập lại mật khẩu mới</span>
            <input
              className="input"
              type="password"
              value={form.confirm_password}
              onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
            />
          </label>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }}>
          Lưu mật khẩu
        </button>
      </form>
    </div>
  );
}
