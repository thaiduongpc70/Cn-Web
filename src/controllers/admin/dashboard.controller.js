const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { cleanDate, buildDateWhere } = require('./resource.helpers');
const { refreshRevenueStatistics } = require('./revenue.helpers');

const dashboard = asyncHandler(async (req, res) => {
  await refreshRevenueStatistics();

  const fromDate = cleanDate(req.query.from);
  const toDate = cleanDate(req.query.to);
  const keyword = String(req.query.q || '').trim();
  const orderDateFilter = buildDateWhere('created_at', fromDate, toDate);
  const revenueDateFilter = buildDateWhere('stat_date', fromDate, toDate);
  const recentOrderDateFilter = buildDateWhere('created_at', fromDate, toDate, 'o');
  const logDateFilter = buildDateWhere('created_at', fromDate, toDate, 'al');
  const dashboardLike = `%${keyword}%`;
  const topProductSearch = keyword
    ? {
      sql: ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR c.name LIKE ?)',
      values: [dashboardLike, dashboardLike, dashboardLike, dashboardLike]
    }
    : { sql: '', values: [] };
  const recentOrderSearch = keyword
    ? {
      sql: ' AND (CAST(o.id AS CHAR) LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ? OR o.delivery_address LIKE ? OR o.status LIKE ? OR pay.method LIKE ? OR pay.status LIKE ?)',
      values: [dashboardLike, dashboardLike, dashboardLike, dashboardLike, dashboardLike, dashboardLike, dashboardLike]
    }
    : { sql: '', values: [] };
  const logSearch = keyword
    ? {
      sql: ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR CAST(al.entity_id AS CHAR) LIKE ? OR u.username LIKE ?)',
      values: [dashboardLike, dashboardLike, dashboardLike, dashboardLike]
    }
    : { sql: '', values: [] };
  const [
    revenueRows,
    todayRevenueRows,
    monthRevenueRows,
    orderRows,
    userRows,
    lowMaterialRows,
    productRows,
    statusRows,
    revenueByDay,
    revenueByMonth,
    invoiceByDay,
    lowMaterials,
    topProducts,
    recentOrders,
    recentLogs
  ] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE status = 'Completed'${orderDateFilter.sql}`,
      orderDateFilter.values
    ),
    query('SELECT * FROM revenue_daily_stats WHERE stat_date = CURDATE() LIMIT 1'),
    query('SELECT * FROM revenue_monthly_stats WHERE stat_year = YEAR(CURDATE()) AND stat_month = MONTH(CURDATE()) LIMIT 1'),
    query(`SELECT COUNT(*) AS total_orders FROM orders${orderDateFilter.whereSql}`, orderDateFilter.values),
    query(`SELECT COUNT(*) AS total_clients FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'Client'`),
    query('SELECT COUNT(*) AS low_materials FROM materials WHERE is_active = TRUE AND stock_quantity <= reorder_point'),
    query('SELECT COUNT(*) AS active_products FROM products WHERE is_active = TRUE'),
    query(`SELECT status, COUNT(*) AS count FROM orders${orderDateFilter.whereSql} GROUP BY status ORDER BY count DESC`, orderDateFilter.values),
    query(`SELECT stat_date AS date, gross_revenue, discount_amount, net_revenue, paid_amount,
                  completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
           FROM revenue_daily_stats
           WHERE 1 = 1${revenueDateFilter.sql}
           ORDER BY stat_date DESC
           LIMIT 31`, revenueDateFilter.values),
    query(`SELECT stat_year, stat_month, gross_revenue, discount_amount, net_revenue, paid_amount,
                  completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
           FROM revenue_monthly_stats
           ORDER BY stat_year DESC, stat_month DESC
           LIMIT 12`),
    query(`SELECT stat_date AS date, invoice_count, pending_count, paid_count, preparing_count,
                  completed_count, cancelled_count, refunded_count, cash_count, online_count
           FROM invoice_daily_stats
           WHERE 1 = 1${revenueDateFilter.sql}
           ORDER BY stat_date DESC
           LIMIT 31`, revenueDateFilter.values),
    query(`SELECT id, name, material_code, unit, stock_quantity, min_stock_level, reorder_point, stock_value
           FROM materials
           WHERE is_active = TRUE AND stock_quantity <= reorder_point
           ORDER BY stock_quantity ASC, id ASC
           LIMIT 8`),
    query(`SELECT p.id, p.name, p.price, p.sales_count, p.recipe_status, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.is_active = TRUE
           ${topProductSearch.sql}
           ORDER BY p.sales_count DESC, p.id DESC
           LIMIT 8`, topProductSearch.values),
    query(`SELECT o.id, o.receiver_name, o.total_amount, o.status, o.created_at,
                  pay.method AS payment_method, pay.status AS payment_status
           FROM orders o
           LEFT JOIN payments pay ON pay.order_id = o.id
           WHERE 1 = 1${recentOrderDateFilter.sql}${recentOrderSearch.sql}
           ORDER BY o.created_at DESC
           LIMIT 8`, [...recentOrderDateFilter.values, ...recentOrderSearch.values]),
    query(`SELECT al.*, u.username
           FROM activity_logs al
           LEFT JOIN users u ON u.id = al.user_id
           WHERE 1 = 1${logDateFilter.sql}${logSearch.sql}
           ORDER BY al.created_at DESC
           LIMIT 8`, [...logDateFilter.values, ...logSearch.values])
  ]);

  res.json({
    cards: {
      revenue: revenueRows[0].revenue,
      today_revenue: todayRevenueRows[0]?.net_revenue || 0,
      month_revenue: monthRevenueRows[0]?.net_revenue || 0,
      total_orders: orderRows[0].total_orders,
      total_clients: userRows[0].total_clients,
      low_materials: lowMaterialRows[0].low_materials,
      active_products: productRows[0].active_products
    },
    order_statuses: statusRows,
    revenue_by_day: revenueByDay.reverse(),
    revenue_by_month: revenueByMonth.reverse(),
    invoice_by_day: invoiceByDay.reverse(),
    low_material_items: lowMaterials,
    top_products: topProducts,
    recent_orders: recentOrders,
    recent_logs: recentLogs,
    filters: {
      q: keyword,
      from: fromDate,
      to: toDate
    }
  });
});

module.exports = {
  dashboard
};
