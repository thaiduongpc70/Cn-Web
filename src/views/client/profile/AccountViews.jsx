import React, { useEffect, useState } from 'react';
import { api } from '../../../../client/src/api.js';
import { dateTime, money, statusClass } from '../../../../client/src/utils.js';

export function OrdersView({ user, notify }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.client.orders().then((result) => setOrders(result.data)).catch((error) => notify(error.message));
  }, [user?.id]);

  if (!user) return <div className="empty-state">Vui lòng đăng nhập để xem đơn hàng.</div>;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Đơn hàng của tôi</h1>
          <p>Theo dõi trạng thái đơn, thanh toán, giao hàng và tài xế.</p>
        </div>
      </div>
      <div className="orders-layout">
        {orders.map((order) => (
          <article className="info-card order-card" key={order.id}>
            <div className="spread">
              <h3>Đơn #{order.id}</h3>
              <span className={statusClass(order.status)}>{order.status}</span>
            </div>
            <div className="money">{money(order.total_amount)}</div>
            <div className="muted">{dateTime(order.created_at)}</div>
            <div>Thanh toán: {order.payment_method} / {order.payment_status}</div>
            <div>Giao hàng: {order.delivery_status || 'Chưa tạo'}</div>
            {order.driver_name && <div>Tài xế: {order.driver_name} - {order.driver_phone}</div>}
          </article>
        ))}
      </div>
    </>
  );
}

export function ProfileView({ user, notify, refreshUser }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!user) return;
    api.client
      .profile()
      .then((result) => {
        setProfile(result.data);
        setForm({
          full_name: result.data.user.full_name || '',
          email: result.data.user.email || '',
          phone: result.data.user.phone || '',
          address: result.data.user.address || ''
        });
      })
      .catch((error) => notify(error.message));
  }, [user?.id]);

  async function save(event) {
    event.preventDefault();
    try {
      await api.client.updateProfile(form);
      await refreshUser();
      notify('Đã cập nhật hồ sơ.');
    } catch (error) {
      notify(error.message);
    }
  }

  if (!user) return <div className="empty-state">Vui lòng đăng nhập để xem hội viên.</div>;
  if (!profile) return <div className="loading">Đang tải hồ sơ...</div>;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Hội viên</h1>
          <p>Theo dõi hạng hội viên, điểm tích lũy, mã quà và lịch sử điểm.</p>
        </div>
      </div>
      <div className="profile-layout">
        <section className="info-card">
          <h3>{profile.user.full_name || profile.user.username}</h3>
          <span className="badge badge-green">{profile.user.membership_rank}</span>
          <p className="money" style={{ fontSize: 28 }}>{profile.user.loyalty_points || 0} điểm</p>
          <p className="muted">{profile.tier?.benefits}</p>
        </section>
        <section className="info-card">
          <h3>Mã quà</h3>
          {profile.gifts.map((gift) => (
            <p key={gift.id}>
              <strong>{gift.code}</strong> - {gift.title}
            </p>
          ))}
        </section>
        <form className="info-card" onSubmit={save}>
          <h3>Thông tin giao hàng</h3>
          <div className="field">
            <label>Họ tên</label>
            <input className="input" value={form.full_name || ''} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div className="field">
            <label>Số điện thoại</label>
            <input className="input" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="field">
            <label>Địa chỉ</label>
            <textarea className="textarea" value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }}>
            Lưu hồ sơ
          </button>
        </form>
      </div>
      <section className="admin-section" style={{ marginTop: 18 }}>
        <h2>Lịch sử điểm</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại</th>
                <th>Điểm</th>
                <th>Lý do</th>
              </tr>
            </thead>
            <tbody>
              {profile.loyalty.map((item) => (
                <tr key={item.id}>
                  <td>{dateTime(item.created_at)}</td>
                  <td>{item.transaction_type}</td>
                  <td>{item.points}</td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function ContentView({ notify }) {
  const [promotions, setPromotions] = useState([]);
  const [news, setNews] = useState([]);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    Promise.all([api.client.promotions(), api.client.news(), api.client.stores()])
      .then(([promoResult, newsResult, storeResult]) => {
        setPromotions(promoResult.data);
        setNews(newsResult.data);
        setStores(storeResult.data);
      })
      .catch((error) => notify(error.message));
  }, []);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Tin tức và cửa hàng</h1>
          <p>Cập nhật ưu đãi mới, câu chuyện đồ uống và các điểm bán gần bạn.</p>
        </div>
      </div>
      <section className="content-grid">
        {promotions.map((item) => (
          <article className="info-card" key={item.id}>
            <span className="badge badge-green">{item.code}</span>
            <h3>{item.title}</h3>
            <p className="muted">{item.description}</p>
          </article>
        ))}
        {news.map((item) => (
          <article className="info-card" key={`n-${item.id}`}>
            <span className="badge badge-gray">{item.post_type}</span>
            <h3>{item.title}</h3>
            <p className="muted">{item.excerpt}</p>
          </article>
        ))}
        {stores.map((item) => (
          <article className="info-card" key={`s-${item.id}`}>
            <h3>{item.name}</h3>
            <p>{item.address}, {item.district}, {item.city}</p>
            <p className="muted">{item.opening_hours} - {item.phone}</p>
          </article>
        ))}
      </section>
    </>
  );
}

