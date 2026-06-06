const { transaction } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const {
  DEFAULT_ICE_LEVEL,
  DEFAULT_SUGAR_LEVEL,
  activeDiscountJoin,
  assertProductAvailable,
  attachCartToppings,
  discountSelect,
  ensureCart,
  getPromotion
} = require('./shop.helpers');

const checkout = asyncHandler(async (req, res) => {
  const { receiver_name, receiver_phone, delivery_address, note, payment_method = 'Cash', promotion_code } = req.body;

  if (!receiver_name || !receiver_phone || !delivery_address) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin giao hàng.' });
  }

  const orderId = await transaction(async (connection) => {
    const cartId = await ensureCart(connection, req.user.id);
    const [items] = await connection.query(
      `SELECT ci.*, p.price, p.name, p.stock_quantity, c.name AS category_name,
              ${discountSelect('pd')},
              COALESCE(pv.price_adjustment, 0) AS price_adjustment
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       ${activeDiscountJoin('p', 'pd')}
       LEFT JOIN product_variants pv ON pv.id = ci.variant_id
       WHERE ci.cart_id = ?
       FOR UPDATE`,
      [cartId]
    );

    if (!items.length) {
      const error = new Error('Giỏ hàng đang trống.');
      error.statusCode = 400;
      throw error;
    }

    const enrichedItems = await attachCartToppings(items);
    for (const item of enrichedItems) {
      await assertProductAvailable(item.product_id, item.variant_id || null, item.quantity, connection);
      for (const topping of item.toppings || []) {
        await assertProductAvailable(topping.id, null, item.quantity, connection);
      }
    }

    const subtotal = enrichedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const [profiles] = await connection.query('SELECT membership_rank FROM customer_profiles WHERE user_id = ?', [req.user.id]);
    const rank = profiles[0]?.membership_rank || 'Silver';
    const promotion = await getPromotion(promotion_code, subtotal, rank);
    if (promotion_code && !promotion) {
      const error = new Error('Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện.');
      error.statusCode = 400;
      throw error;
    }
    const discount = promotion ? promotion.discount_amount : 0;
    const total = subtotal - discount;

    const [orderResult] = await connection.query(
      `INSERT INTO orders(user_id, promotion_id, receiver_name, receiver_phone, delivery_address, subtotal, discount_amount, total_amount, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [
        req.user.id,
        promotion ? promotion.id : null,
        receiver_name,
        receiver_phone,
        delivery_address,
        subtotal,
        discount,
        total,
        note || null
      ]
    );

    for (const item of enrichedItems) {
      const unitPrice = Number(item.base_unit_price);
      await connection.query(
        `INSERT INTO order_details(order_id, product_id, variant_id, quantity, unit_price, subtotal, ice_level, sugar_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.product_id,
          item.variant_id || null,
          item.quantity,
          unitPrice,
          unitPrice * item.quantity,
          item.ice_level || DEFAULT_ICE_LEVEL,
          item.sugar_level || DEFAULT_SUGAR_LEVEL
        ]
      );

      for (const topping of item.toppings || []) {
        await connection.query(
          `INSERT INTO order_details(order_id, product_id, variant_id, quantity, unit_price, subtotal, ice_level, sugar_level)
           VALUES (?, ?, NULL, ?, ?, ?, NULL, NULL)`,
          [
            orderResult.insertId,
            topping.id,
            item.quantity,
            Number(topping.price),
            Number(topping.price) * item.quantity
          ]
        );
      }
    }

    const paymentStatus = payment_method === 'Cash' ? 'Pending' : 'Paid';
    await connection.query(
      `INSERT INTO payments(order_id, amount, method, status, transaction_code, paid_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderResult.insertId,
        total,
        payment_method,
        paymentStatus,
        paymentStatus === 'Paid' ? `${payment_method.toUpperCase()}-${Date.now()}-${orderResult.insertId}` : null,
        paymentStatus === 'Paid' ? new Date() : null
      ]
    );

    if (paymentStatus === 'Paid') {
      await connection.query('UPDATE orders SET status = ? WHERE id = ?', ['Paid', orderResult.insertId]);
    }

    if (promotion) {
      await connection.query('UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [promotion.id]);
      await connection.query(
        'INSERT INTO promotion_usage(user_id, promotion_id, order_id) VALUES (?, ?, ?)',
        [req.user.id, promotion.id, orderResult.insertId]
      );
    }

    await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await connection.query(
      'INSERT INTO activity_logs(user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        `Khách hàng đặt đơn #${orderResult.insertId}`,
        'orders',
        orderResult.insertId,
        req.ip,
        req.get('user-agent')
      ]
    );

    return orderResult.insertId;
  });

  res.status(201).json({ id: orderId, message: 'Đã đặt hàng thành công.' });
});

module.exports = {
  checkout
};
