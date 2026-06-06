import React, { useEffect, useState } from 'react';
import { api } from '../../../../client/src/api.js';
import { dateTime, money, shortDate, statusClass } from '../../../../client/src/utils.js';

export function Dashboard({ notify }) {
  const [data, setData] = useState(null);
  const [revenueType, setRevenueType] = useState('daily');
  const [dashboardFilters, setDashboardFilters] = useState({ q: '', from: '', to: '' });

  function loadDashboard(nextFilters = dashboardFilters) {
    api.admin.dashboard(nextFilters).then(setData).catch((error) => notify(error.message));
  }

  function changeDashboardFilter(field, value) {
    setDashboardFilters((current) => ({ ...current, [field]: value }));
  }

  function resetDashboardFilters() {
    const emptyFilters = { q: '', from: '', to: '' };
    setDashboardFilters(emptyFilters);
    loadDashboard(emptyFilters);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!data) return <div className="loading">Đang tải tổng quan...</div>;

  const cards = [
    ['Hôm nay', money(data.cards.today_revenue)],
    ['Tháng này', money(data.cards.month_revenue)],
    ['Tổng doanh thu', money(data.cards.revenue)],
    ['Đơn hàng', data.cards.total_orders],
    ['Cảnh báo kho', data.cards.low_materials]
  ];
  const revenueDays = data.revenue_by_day || [];
  const invoiceDays = data.invoice_by_day || [];
  const lowMaterials = data.low_material_items || [];
  const topProducts = data.top_products || [];
  const recentOrders = data.recent_orders || [];
  const recentLogs = data.recent_logs || [];

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Tổng quan</h1>
          <p>Theo dõi doanh thu, hóa đơn, công thức và tồn kho nguyên liệu.</p>
        </div>
        <div className="resource-tools report-tools">
          <select className="select" value={revenueType} onChange={(event) => setRevenueType(event.target.value)}>
            <option value="daily">Theo ngày</option>
            <option value="monthly">Theo tháng</option>
            <option value="quarterly">Theo quý</option>
            <option value="yearly">Theo năm</option>
          </select>
          <button className="btn btn-primary" onClick={() => api.admin.revenuePdf(revenueType, dashboardFilters)}>
            Xuất PDF doanh thu
          </button>
        </div>
      </div>
      <form
        className="admin-filter-bar dashboard-filter-bar"
        onSubmit={(event) => {
          event.preventDefault();
          loadDashboard(dashboardFilters);
        }}
      >
        <label className="filter-field filter-search">
          <span>Tìm kiếm</span>
          <input
            className="input"
            value={dashboardFilters.q}
            placeholder="Tìm đơn, khách, sản phẩm, nhật ký"
            onChange={(event) => changeDashboardFilter('q', event.target.value)}
          />
        </label>
        <label className="filter-field">
          <span>Từ ngày</span>
          <input className="input" type="date" value={dashboardFilters.from} onChange={(event) => changeDashboardFilter('from', event.target.value)} />
        </label>
        <label className="filter-field">
          <span>Đến ngày</span>
          <input className="input" type="date" value={dashboardFilters.to} onChange={(event) => changeDashboardFilter('to', event.target.value)} />
        </label>
        <div className="filter-actions">
          <button className="btn btn-primary">Lọc dashboard</button>
          <button className="btn btn-light" type="button" onClick={resetDashboardFilters} disabled={!dashboardFilters.q && !dashboardFilters.from && !dashboardFilters.to}>
            Xóa lọc
          </button>
        </div>
      </form>
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="admin-section">
          <h2>Doanh thu gần đây</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Doanh thu</th>
                  <th>Đơn</th>
                  <th>Giá trị TB</th>
                </tr>
              </thead>
              <tbody>
                {revenueDays.slice(-7).map((item) => (
                  <tr key={item.date}>
                    <td>{shortDate(item.date)}</td>
                    <td>{money(item.net_revenue)}</td>
                    <td>{item.total_orders}</td>
                    <td>{money(item.average_order_value)}</td>
                  </tr>
                ))}
                {!revenueDays.length && (
                  <tr><td colSpan="4" className="muted">Chưa có dữ liệu doanh thu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-section">
          <h2>Hóa đơn</h2>
          <div className="compact-list">
            {invoiceDays.slice(-6).map((item) => (
              <div className="list-row" key={item.date}>
                <div>
                  <strong>{shortDate(item.date)}</strong>
                  <span>{item.completed_count} hoàn tất, {item.cancelled_count} hủy</span>
                </div>
                <b>{item.invoice_count}</b>
              </div>
            ))}
            {!invoiceDays.length && <p className="muted">Chưa có dữ liệu hóa đơn.</p>}
          </div>
        </section>
        <section className="admin-section">
          <h2>Cảnh báo nguyên liệu</h2>
          <div className="compact-list">
            {lowMaterials.map((item) => (
              <div className="list-row warning-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>Cần giữ tối thiểu {item.reorder_point} {item.unit}</span>
                </div>
                <b>{Number(item.stock_quantity).toLocaleString('vi-VN')} {item.unit}</b>
              </div>
            ))}
            {!lowMaterials.length && <p className="muted">Nguyên liệu đang đủ an toàn.</p>}
          </div>
        </section>
        <section className="admin-section">
          <h2>Sản phẩm bán tốt</h2>
          <div className="compact-list">
            {topProducts.map((item) => (
              <div className="list-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.category_name || 'Chưa phân loại'} - {item.recipe_status}</span>
                </div>
                <b>{item.sales_count}</b>
              </div>
            ))}
            {!topProducts.length && <p className="muted">Chưa có sản phẩm.</p>}
          </div>
        </section>
        <section className="admin-section">
          <h2>Đơn hàng gần đây</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Khách</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.receiver_name}</td>
                    <td>{money(order.total_amount)}</td>
                    <td><span className={statusClass(order.status)}>{order.status}</span></td>
                    <td>{dateTime(order.created_at)}</td>
                  </tr>
                ))}
                {!recentOrders.length && (
                  <tr><td colSpan="5" className="muted">Chưa có đơn hàng.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-section">
          <h2>Nhật ký</h2>
          <div className="compact-list">
            {recentLogs.map((log) => (
              <div className="list-row log-row" key={log.id}>
                <div>
                  <strong>{log.username || 'System'}</strong>
                  <span>{log.action}</span>
                </div>
                <small>{dateTime(log.created_at)}</small>
              </div>
            ))}
            {!recentLogs.length && <p className="muted">Chưa có nhật ký.</p>}
          </div>
        </section>
      </div>
    </>
  );
}