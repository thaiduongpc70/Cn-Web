const { query, transaction } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const {
  DEFAULT_ICE_LEVEL,
  DEFAULT_SUGAR_LEVEL,
  normalizeOption,
  parseToppingIds,
  optionHash,
  getActiveToppings,
  assertProductAvailable,
  attachCartToppings,
  ensureCart,
  loadCart,
  getPromotion
} = require('./shop.helpers');

const cart = asyncHandler(async (req, res) => {
  const cartData = await loadCart(req.user.id);
  res.json({ data: cartData });
});

const addCartItem = asyncHandler(async (req, res) => {
  const { product_id, variant_id, quantity = 1 } = req.body;
  const products = await query(
    `SELECT p.id, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.is_active = TRUE
     LIMIT 1`,
    [product_id]
  );

  if (!products.length) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  }

  const isToppingProduct = products[0].category_name === 'Topping';
  const iceLevel = isToppingProduct ? null : normalizeOption(req.body.ice_level, DEFAULT_ICE_LEVEL);
  const sugarLevel = isToppingProduct ? null : normalizeOption(req.body.sugar_level, DEFAULT_SUGAR_LEVEL);
  const toppingIds = isToppingProduct ? [] : parseToppingIds(req.body.topping_ids);
  const toppings = await getActiveToppings(toppingIds);

  if (toppings.length !== toppingIds.length) {
    return res.status(400).json({ message: 'Topping không hợp lệ hoặc đã ngừng bán.' });
  }

  await transaction(async (connection) => {
    const cartId = await ensureCart(connection, req.user.id);
    const requestedQuantity = Math.max(Number(quantity), 1);
    await assertProductAvailable(product_id, variant_id || null, requestedQuantity, connection);
    for (const toppingId of toppingIds) {
      await assertProductAvailable(toppingId, null, requestedQuantity, connection);
    }

    const hash = optionHash({ iceLevel, sugarLevel, toppingIds });
    const [existing] = await connection.query(
      `SELECT id, quantity
       FROM cart_items
       WHERE cart_id = ? AND product_id = ? AND variant_id <=> ? AND option_hash = ?
       LIMIT 1`,
      [cartId, product_id, variant_id || null, hash]
    );

    if (existing.length) {
      await connection.query(
        'UPDATE cart_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [requestedQuantity, existing[0].id]
      );
    } else {
      await connection.query(
        `INSERT INTO cart_items(cart_id, product_id, variant_id, quantity, ice_level, sugar_level, topping_ids, option_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cartId, product_id, variant_id || null, requestedQuantity, iceLevel, sugarLevel, toppingIds.join(','), hash]
      );
    }
  });

  res.status(201).json({ message: 'Đã thêm vào giỏ hàng.' });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const nextQuantity = Number(quantity);

  if (nextQuantity <= 0) {
    await query(
      `DELETE ci FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? AND c.user_id = ?`,
      [req.params.id, req.user.id]
    );
    return res.json({ message: 'Đã xóa sản phẩm khỏi giỏ.' });
  }

  await transaction(async (connection) => {
    const [items] = await connection.query(
      `SELECT ci.product_id, ci.variant_id, ci.topping_ids
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? AND c.user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!items.length) {
      const error = new Error('Không tìm thấy sản phẩm trong giỏ.');
      error.statusCode = 404;
      throw error;
    }

    const item = items[0];
    await assertProductAvailable(item.product_id, item.variant_id || null, nextQuantity, connection);
    for (const toppingId of parseToppingIds(item.topping_ids)) {
      await assertProductAvailable(toppingId, null, nextQuantity, connection);
    }

    await connection.query(
      `UPDATE cart_items
       SET quantity = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextQuantity, req.params.id]
    );
  });

  res.json({ message: 'Đã cập nhật số lượng.' });
});

const removeCartItem = asyncHandler(async (req, res) => {
  await query(
    `DELETE ci FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     WHERE ci.id = ? AND c.user_id = ?`,
    [req.params.id, req.user.id]
  );

  res.json({ message: 'Đã xóa sản phẩm khỏi giỏ.' });
});

const applyPromotion = asyncHandler(async (req, res) => {
  const cartData = await loadCart(req.user.id);
  const promotion = await getPromotion(req.body.code, cartData.subtotal, req.user.membership_rank);

  if (!promotion) {
    return res.status(400).json({ message: 'Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện.' });
  }

  res.json({
    data: {
      promotion,
      subtotal: cartData.subtotal,
      total_amount: cartData.subtotal - promotion.discount_amount
    }
  });
});

module.exports = {
  cart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  applyPromotion
};
