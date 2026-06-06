const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const {
  escapeHtml,
  formatDate,
  formatMoney,
  htmlToPdfBuffer,
  sendPdf
} = require('../../utils/pdfExport');

const exportInvoicePdf = asyncHandler(async (req, res) => {
  const orderRows = await query(
    `SELECT o.*, u.username, cp.full_name, cp.email, p.code AS promotion_code,
            pay.method AS payment_method, pay.status AS payment_status, pay.transaction_code, pay.paid_at
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN customer_profiles cp ON cp.user_id = u.id
     LEFT JOIN promotions p ON p.id = o.promotion_id
     LEFT JOIN payments pay ON pay.order_id = o.id
     WHERE o.id = ?
     LIMIT 1`,
    [req.params.id]
  );

  if (!orderRows.length) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xuất hóa đơn.' });
  }

  const order = orderRows[0];
  const items = await query(
    `SELECT od.*, p.name AS product_name, c.name AS category_name, pv.variant_name
     FROM order_details od
     JOIN products p ON p.id = od.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants pv ON pv.id = od.variant_id
     WHERE od.order_id = ?
     ORDER BY od.id ASC`,
    [req.params.id]
  );

  const itemRows = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${escapeHtml(item.product_name)}</strong>
        <small>${escapeHtml([item.variant_name, item.ice_level && `Đá ${item.ice_level}`, item.sugar_level && `Đường ${item.sugar_level}`].filter(Boolean).join(' - '))}</small>
      </td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.unit_price)}</td>
      <td>${formatMoney(item.subtotal)}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <style>
        @page { margin: 18mm; }
        * { box-sizing: border-box; }
        body { color: #162230; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.45; margin: 0; }
        h1, h2, p { margin: 0; }
        .header { align-items: flex-start; border-bottom: 3px solid #1f8e50; display: flex; justify-content: space-between; padding-bottom: 18px; }
        .brand { color: #0c6b3e; font-size: 28px; font-weight: 900; letter-spacing: 1px; }
        .badge { background: #e7f6ee; border-radius: 999px; color: #0c6b3e; display: inline-block; font-weight: 800; margin-top: 8px; padding: 5px 12px; }
        .right { text-align: right; }
        .grid { display: grid; gap: 18px; grid-template-columns: 1fr 1fr; margin: 22px 0; }
        .box { border: 1px solid #dce8e1; border-radius: 10px; padding: 14px; }
        .box h2 { color: #0c6b3e; font-size: 15px; margin-bottom: 10px; }
        table { border-collapse: collapse; margin-top: 12px; width: 100%; }
        th { background: #e7f6ee; color: #0c6b3e; font-weight: 900; }
        th, td { border-bottom: 1px solid #dce8e1; padding: 10px; text-align: left; vertical-align: top; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5), th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
        small { color: #617083; display: block; margin-top: 3px; }
        .totals { margin-left: auto; margin-top: 18px; width: 320px; }
        .total-row { display: flex; justify-content: space-between; padding: 7px 0; }
        .grand { border-top: 2px solid #1f8e50; color: #0c6b3e; font-size: 18px; font-weight: 900; margin-top: 8px; padding-top: 10px; }
        .footer { border-top: 1px solid #dce8e1; color: #617083; margin-top: 26px; padding-top: 12px; }
      </style>
    </head>
    <body>
      <section class="header">
        <div>
          <div class="brand">BANTRASUA</div>
          <p>Trà sữa tươi, topping nấu mới mỗi ngày</p>
          <span class="badge">HÓA ĐƠN BÁN HÀNG</span>
        </div>
        <div class="right">
          <h1>#${order.id}</h1>
          <p>${formatDate(order.created_at)}</p>
          <p>Trạng thái: <strong>${escapeHtml(order.status)}</strong></p>
        </div>
      </section>

      <section class="grid">
        <div class="box">
          <h2>Thông tin khách hàng</h2>
          <p><strong>${escapeHtml(order.receiver_name || order.full_name || order.username || 'Khách hàng')}</strong></p>
          <p>SĐT: ${escapeHtml(order.receiver_phone || '')}</p>
          <p>Email: ${escapeHtml(order.email || '')}</p>
          <p>Địa chỉ: ${escapeHtml(order.delivery_address || '')}</p>
        </div>
        <div class="box">
          <h2>Thanh toán</h2>
          <p>Phương thức: ${escapeHtml(order.payment_method || 'Chưa ghi nhận')}</p>
          <p>Trạng thái: ${escapeHtml(order.payment_status || 'Chưa ghi nhận')}</p>
          <p>Mã giao dịch: ${escapeHtml(order.transaction_code || '-')}</p>
          <p>Mã giảm giá: ${escapeHtml(order.promotion_code || '-')}</p>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Sản phẩm</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <section class="totals">
        <div class="total-row"><span>Tạm tính</span><strong>${formatMoney(order.subtotal)}</strong></div>
        <div class="total-row"><span>Giảm giá</span><strong>-${formatMoney(order.discount_amount)}</strong></div>
        <div class="total-row grand"><span>Tổng cộng</span><strong>${formatMoney(order.total_amount)}</strong></div>
      </section>

      <section class="footer">
        <p>Cảm ơn quý khách đã mua hàng tại BANTRASUA.</p>
        <p>Xuất bởi admin: ${escapeHtml(req.user?.username || 'admin')} - ${formatDate(new Date())}</p>
      </section>
    </body>
    </html>
  `;

  const fallbackLines = [
    `BANTRASUA - HOA DON BAN HANG #${order.id}`,
    `Ngay: ${formatDate(order.created_at)}`,
    `Khach: ${order.receiver_name || order.full_name || order.username || ''}`,
    `Dien thoai: ${order.receiver_phone || ''}`,
    `Dia chi: ${order.delivery_address || ''}`,
    '',
    ...items.map((item, index) => `${index + 1}. ${item.product_name} x${item.quantity} - ${formatMoney(item.subtotal)}`),
    '',
    `Tam tinh: ${formatMoney(order.subtotal)}`,
    `Giam gia: ${formatMoney(order.discount_amount)}`,
    `Tong cong: ${formatMoney(order.total_amount)}`
  ];
  const buffer = await htmlToPdfBuffer(html, fallbackLines);
  sendPdf(res, buffer, `bantrasua-hoa-don-${order.id}.pdf`);
});

const exportRevenuePdf = asyncHandler(async (req, res) => {
  const type = ['daily', 'monthly', 'quarterly', 'yearly'].includes(req.query.type) ? req.query.type : 'daily';
  const definitions = {
    daily: {
      title: 'Báo cáo doanh thu theo ngày',
      filename: 'doanh-thu-ngay',
      sql: `SELECT DATE_FORMAT(stat_date, '%d/%m/%Y') AS period_label, gross_revenue, discount_amount, net_revenue,
                   paid_amount, completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
            FROM revenue_daily_stats
            ORDER BY stat_date DESC
            LIMIT 31`
    },
    monthly: {
      title: 'Báo cáo doanh thu theo tháng',
      filename: 'doanh-thu-thang',
      sql: `SELECT CONCAT(LPAD(stat_month, 2, '0'), '/', stat_year) AS period_label, gross_revenue, discount_amount,
                   net_revenue, paid_amount, completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
            FROM revenue_monthly_stats
            ORDER BY stat_year DESC, stat_month DESC
            LIMIT 24`
    },
    quarterly: {
      title: 'Báo cáo doanh thu theo quý',
      filename: 'doanh-thu-quy',
      sql: `SELECT CONCAT('Quý ', stat_quarter, '/', stat_year) AS period_label, gross_revenue, discount_amount,
                   net_revenue, paid_amount, completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
            FROM revenue_quarterly_stats
            ORDER BY stat_year DESC, stat_quarter DESC
            LIMIT 16`
    },
    yearly: {
      title: 'Báo cáo doanh thu theo năm',
      filename: 'doanh-thu-nam',
      sql: `SELECT stat_year AS period_label, gross_revenue, discount_amount, net_revenue, paid_amount,
                   completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
            FROM revenue_yearly_stats
            ORDER BY stat_year DESC
            LIMIT 10`
    }
  };
  const definition = definitions[type];
  const rows = await query(definition.sql);
  const totals = rows.reduce((sum, row) => ({
    gross_revenue: sum.gross_revenue + Number(row.gross_revenue || 0),
    discount_amount: sum.discount_amount + Number(row.discount_amount || 0),
    net_revenue: sum.net_revenue + Number(row.net_revenue || 0),
    paid_amount: sum.paid_amount + Number(row.paid_amount || 0),
    completed_orders: sum.completed_orders + Number(row.completed_orders || 0),
    total_orders: sum.total_orders + Number(row.total_orders || 0),
    items_sold: sum.items_sold + Number(row.items_sold || 0)
  }), {
    gross_revenue: 0,
    discount_amount: 0,
    net_revenue: 0,
    paid_amount: 0,
    completed_orders: 0,
    total_orders: 0,
    items_sold: 0
  });

  const tableRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.period_label)}</td>
      <td>${formatMoney(row.gross_revenue)}</td>
      <td>${formatMoney(row.discount_amount)}</td>
      <td>${formatMoney(row.net_revenue)}</td>
      <td>${row.completed_orders}/${row.total_orders}</td>
      <td>${row.items_sold}</td>
      <td>${formatMoney(row.average_order_value)}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <style>
        @page { margin: 14mm; size: A4 landscape; }
        body { color: #162230; font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
        h1, p { margin: 0; }
        .header { border-bottom: 3px solid #1f8e50; display: flex; justify-content: space-between; padding-bottom: 14px; }
        .brand { color: #0c6b3e; font-size: 24px; font-weight: 900; }
        .meta { color: #617083; margin-top: 5px; }
        .summary { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); margin: 18px 0; }
        .card { background: #e7f6ee; border: 1px solid #ccebdd; border-radius: 10px; padding: 12px; }
        .card span { color: #617083; display: block; font-weight: 700; }
        .card strong { color: #0c6b3e; display: block; font-size: 18px; margin-top: 5px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #0c6b3e; color: #fff; }
        th, td { border: 1px solid #dce8e1; padding: 8px; text-align: left; }
        td:nth-child(n+3), th:nth-child(n+3) { text-align: right; }
        .footer { color: #617083; margin-top: 14px; }
      </style>
    </head>
    <body>
      <section class="header">
        <div>
          <div class="brand">BANTRASUA</div>
          <h1>${escapeHtml(definition.title)}</h1>
          <p class="meta">Xuất lúc ${formatDate(new Date())}</p>
        </div>
        <div>
          <p>Admin: <strong>${escapeHtml(req.user?.username || 'admin')}</strong></p>
          <p>Số dòng: <strong>${rows.length}</strong></p>
        </div>
      </section>
      <section class="summary">
        <div class="card"><span>Doanh thu thuần</span><strong>${formatMoney(totals.net_revenue)}</strong></div>
        <div class="card"><span>Doanh thu gộp</span><strong>${formatMoney(totals.gross_revenue)}</strong></div>
        <div class="card"><span>Đơn hoàn tất / tổng đơn</span><strong>${totals.completed_orders}/${totals.total_orders}</strong></div>
        <div class="card"><span>Sản phẩm bán</span><strong>${totals.items_sold}</strong></div>
      </section>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Kỳ</th>
            <th>Gộp</th>
            <th>Giảm giá</th>
            <th>Thuần</th>
            <th>Đơn</th>
            <th>SL bán</th>
            <th>TB/đơn</th>
          </tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="8">Chưa có dữ liệu thống kê.</td></tr>'}</tbody>
      </table>
      <p class="footer">Dữ liệu lấy từ bảng thống kê doanh thu trong database.</p>
    </body>
    </html>
  `;

  const fallbackLines = [
    `BANTRASUA - ${definition.title}`,
    `Xuat luc: ${formatDate(new Date())}`,
    `Doanh thu thuan: ${formatMoney(totals.net_revenue)}`,
    `Tong don: ${totals.total_orders}`,
    '',
    ...rows.map((row) => `${row.period_label}: ${formatMoney(row.net_revenue)} | Don ${row.completed_orders}/${row.total_orders}`)
  ];
  const buffer = await htmlToPdfBuffer(html, fallbackLines);
  sendPdf(res, buffer, `bantrasua-${definition.filename}.pdf`);
});

module.exports = {
  exportInvoicePdf,
  exportRevenuePdf
};