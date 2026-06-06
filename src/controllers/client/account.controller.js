const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');

const myOrders = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT o.*, p.code AS promotion_code, pay.method AS payment_method, pay.status AS payment_status,
            od.status AS delivery_status, od.estimated_arrival, od.delivered_at,
            d.name AS driver_name, d.phone AS driver_phone
     FROM orders o
     LEFT JOIN promotions p ON p.id = o.promotion_id
     LEFT JOIN payments pay ON pay.order_id = o.id
     LEFT JOIN order_deliveries od ON od.order_id = o.id
     LEFT JOIN drivers d ON d.id = od.driver_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );

  res.json({ data: rows });
});

const orderDetail = asyncHandler(async (req, res) => {
  const orders = await query(
    `SELECT o.*, p.code AS promotion_code, pay.method AS payment_method, pay.status AS payment_status,
            od.status AS delivery_status, od.estimated_arrival, od.delivered_at,
            d.name AS driver_name, d.phone AS driver_phone
     FROM orders o
     LEFT JOIN promotions p ON p.id = o.promotion_id
     LEFT JOIN payments pay ON pay.order_id = o.id
     LEFT JOIN order_deliveries od ON od.order_id = o.id
     LEFT JOIN drivers d ON d.id = od.driver_id
     WHERE o.id = ? AND o.user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!orders.length) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  }

  const details = await query(
    `SELECT od.*, p.name, pi.image_url, pv.variant_name
     FROM order_details od
     JOIN products p ON p.id = od.product_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
     LEFT JOIN product_variants pv ON pv.id = od.variant_id
     WHERE od.order_id = ?
     ORDER BY od.id ASC`,
    [req.params.id]
  );

  res.json({ data: { ...orders[0], details } });
});

const profile = asyncHandler(async (req, res) => {
  const [tier, gifts, loyalty] = await Promise.all([
    query('SELECT * FROM membership_tiers WHERE rank_name = ? LIMIT 1', [req.user.membership_rank || 'Silver']),
    query(
      `SELECT mgc.*, mt.rank_name
       FROM member_gift_codes mgc
       JOIN membership_tiers mt ON mt.id = mgc.membership_tier_id
       WHERE mt.rank_name = ?
         AND mgc.is_active = TRUE
         AND NOW() BETWEEN mgc.start_date AND mgc.end_date
       ORDER BY mgc.end_date ASC`,
      [req.user.membership_rank || 'Silver']
    ),
    query(
      `SELECT *
       FROM loyalty_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    )
  ]);

  res.json({
    data: {
      user: req.user,
      tier: tier[0] || null,
      gifts,
      loyalty
    }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, email, phone, address } = req.body;

  await query(
    `UPDATE customer_profiles
     SET full_name = ?, email = ?, phone = ?, address = ?
     WHERE user_id = ?`,
    [full_name, email || null, phone || null, address || null, req.user.id]
  );

  res.json({ message: 'Đã cập nhật hồ sơ.' });
});

module.exports = {
  myOrders,
  orderDetail,
  profile,
  updateProfile
};