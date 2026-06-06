import React, { useState } from 'react';
import { api } from '../../../client/src/api.js';
import { classNames } from '../../../client/src/utils.js';

export function ChatWidget({ user, notify }) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  async function ensureSession() {
    if (sessionId) return sessionId;
    const result = await api.client.startChat({ title: 'Tư vấn món và đặt hàng' });
    setSessionId(result.id);
    const loaded = await api.client.chatMessages(result.id);
    setMessages(loaded.data);
    return result.id;
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        await ensureSession();
      } catch (error) {
        notify(error.message);
      }
    }
  }

  async function send(text = message) {
    if (!text.trim()) return;
    try {
      const id = await ensureSession();
      await api.client.sendChat(id, { message: text });
      const loaded = await api.client.chatMessages(id);
      setMessages(loaded.data);
      setMessage('');
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <>
      <div className="contact-bubbles" aria-label="Liên hệ BANTRASUA">
        <a className="contact-bubble facebook" href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook">
          f
        </a>
        <a className="contact-bubble zalo" href="https://zalo.me" target="_blank" rel="noreferrer" title="Zalo">
          Z
        </a>
        <button className="contact-bubble messenger" onClick={toggle} title="Chatbot AI">
          <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true">
            <path d="M12 2.6C6.6 2.6 2.5 6.5 2.5 11.8c0 3 1.4 5.6 3.7 7.3v3l3.4-1.9c.8.2 1.6.3 2.4.3 5.4 0 9.5-3.9 9.5-9.2S17.4 2.6 12 2.6Zm.8 12-2.4-2.5-4.6 2.5 5-5.3 2.5 2.5 4.5-2.5-5 5.3Z" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="chat-widget">
          <div className="chat-head">
            <div className="chat-agent">
              <span className="chat-avatar">B</span>
              <div>
                <h3>Trợ lý BANTRASUA</h3>
                <span>Tư vấn món và đặt hàng</span>
              </div>
            </div>
            <button className="chat-close" type="button" onClick={() => setOpen(false)} title="Đóng chat">
              ×
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((item) => (
              <div key={item.id} className={classNames('chat-row', item.sender)}>
                <div className={classNames('chat-bubble', item.sender)}>
                  <small>{item.sender === 'user' ? user?.username || 'Bạn' : 'BANTRASUA'}</small>
                  <span>{item.message}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="chat-suggestions">
              {['Xin chào', 'Đề xuất trà sữa', 'Khuyến mãi'].map((text) => (
                <button key={text} className="btn btn-outline btn-small" onClick={() => send(text)}>
                  {text}
                </button>
              ))}
            </div>
            <form
              className="chat-input"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <input className="input" placeholder="Nhập tin nhắn..." value={message} onChange={(event) => setMessage(event.target.value)} />
              <button className="chat-send" title="Gửi tin nhắn">➤</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ClientFooter({ setView }) {
  const quickLinks = [
    ['home', 'Trang chủ'],
    ['menu', 'Menu trà sữa'],
    ['content', 'Tin tức & Cửa hàng'],
    ['cart', 'Giỏ hàng'],
    ['profile', 'Hội viên']
  ];

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <section className="footer-brand">
          <button className="footer-logo" onClick={() => setView('home')}>
            <span>B</span>
            BANTRASUA
          </button>
          <p>
            Trà sữa tươi mát, topping nấu mới mỗi ngày và ưu đãi dành riêng cho hội viên.
          </p>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">f</a>
            <a href="https://zalo.me" target="_blank" rel="noreferrer">Z</a>
            <button type="button" onClick={() => setView('content')}>Tin</button>
          </div>
        </section>

        <section className="footer-column">
          <h3>Khám phá</h3>
          {quickLinks.map(([key, label]) => (
            <button key={key} onClick={() => setView(key)}>{label}</button>
          ))}
        </section>

        <section className="footer-column">
          <h3>Hỗ trợ</h3>
          <span>Hotline: 1900 1508</span>
          <span>Email: hello@bantrasua.local</span>
          <span>08:00 - 22:30 mỗi ngày</span>
          <span>Giao hàng nội thành</span>
        </section>

        <section className="footer-newsletter">
          <h3>Nhận ưu đãi mới</h3>
          <p>Để lại email để không bỏ lỡ voucher và món mới trong tuần.</p>
          <form onSubmit={(event) => event.preventDefault()}>
            <input placeholder="Email của bạn" />
            <button>Đăng ký</button>
          </form>
        </section>
      </div>
      <div className="footer-bottom">
        <span>© 2026 BANTRASUA</span>
        <span>Fresh milk tea, made with care.</span>
      </div>
    </footer>
  );
}

