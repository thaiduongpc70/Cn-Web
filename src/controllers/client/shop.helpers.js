const crypto = require('crypto');
const { query } = require('../../config/db');

const DEFAULT_ICE_LEVEL = 'Bình thường';
const DEFAULT_SUGAR_LEVEL = 'Bình thường';
const BEST_SELLER_LIMIT = 12;

function bestSellerRankJoin(productAlias = 'p', rankAlias = 'best_rank') {
  return `LEFT JOIN (
    SELECT ranked.id
    FROM (
      SELECT p2.id
      FROM products p2
      LEFT JOIN (
        SELECT od.product_id, SUM(od.quantity) AS sold_quantity
        FROM order_details od
        JOIN orders o ON o.id = od.order_id
        WHERE o.status = 'Completed'
        GROUP BY od.product_id
      ) sold ON sold.product_id = p2.id
      WHERE p2.is_active = TRUE
        AND GREATEST(COALESCE(p2.sales_count, 0), COALESCE(sold.sold_quantity, 0)) > 0
      ORDER BY GREATEST(COALESCE(p2.sales_count, 0), COALESCE(sold.sold_quantity, 0)) DESC, p2.id ASC
      LIMIT ${BEST_SELLER_LIMIT}
    ) ranked
  ) ${rankAlias} ON ${rankAlias}.id = ${productAlias}.id`;
}

function completedSalesJoin(productAlias = 'p', salesAlias = 'completed_sales') {
  return `LEFT JOIN (
    SELECT od.product_id, SUM(od.quantity) AS sold_quantity
    FROM order_details od
    JOIN orders o ON o.id = od.order_id
    WHERE o.status = 'Completed'
    GROUP BY od.product_id
  ) ${salesAlias} ON ${salesAlias}.product_id = ${productAlias}.id`;
}

function stockStatusJoin(productAlias = 'p', statusAlias = 'stock_status') {
  return `LEFT JOIN (
    SELECT needed.product_id
    FROM (
      SELECT
        pr.product_id,
        pr.material_id,
        SUM(pr.quantity * (1 + pr.loss_percent / 100)) AS required_quantity
      FROM product_recipes pr
      WHERE pr.is_optional = FALSE
        AND pr.variant_id IS NULL
      GROUP BY pr.product_id, pr.material_id
    ) needed
    JOIN materials m ON m.id = needed.material_id
    WHERE m.is_active = FALSE
       OR m.stock_quantity < needed.required_quantity
    GROUP BY needed.product_id
  ) ${statusAlias} ON ${statusAlias}.product_id = ${productAlias}.id`;
}

function productOutOfStockExpression(productAlias = 'p', statusAlias = 'stock_status') {
  return `(${productAlias}.stock_quantity <= 0
          OR (${productAlias}.recipe_required = TRUE AND ${statusAlias}.product_id IS NOT NULL)
          OR (${productAlias}.recipe_required = TRUE AND NOT EXISTS (
            SELECT 1
            FROM product_recipes required_recipe
            WHERE required_recipe.product_id = ${productAlias}.id
              AND required_recipe.is_optional = FALSE
          )))`;
}

function variantOutOfStockExpression(productAlias = 'p', variantAlias = 'pv') {
  return `(${variantAlias}.id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM product_recipes variant_recipe
            JOIN materials variant_material ON variant_material.id = variant_recipe.material_id
            WHERE variant_recipe.product_id = ${productAlias}.id
              AND variant_recipe.is_optional = FALSE
              AND variant_recipe.variant_id <=> ${variantAlias}.id
            GROUP BY variant_recipe.material_id
            HAVING MAX(CASE WHEN variant_material.is_active = TRUE THEN variant_material.stock_quantity ELSE 0 END)
              < SUM(variant_recipe.quantity * (1 + variant_recipe.loss_percent / 100))
          ))`;
}

function activeDiscountJoin(productAlias = 'p', discountAlias = 'pd') {
  return `LEFT JOIN product_discounts ${discountAlias} ON ${discountAlias}.id = (
    SELECT pd2.id
    FROM product_discounts pd2
    WHERE pd2.is_active = TRUE
      AND NOW() BETWEEN pd2.start_date AND pd2.end_date
      AND (
        (pd2.scope = 'Product' AND pd2.product_id = ${productAlias}.id)
        OR (pd2.scope = 'Category' AND pd2.category_id = ${productAlias}.category_id)
      )
    ORDER BY CASE WHEN pd2.scope = 'Product' THEN 2 ELSE 1 END DESC,
             pd2.priority DESC,
             pd2.discount_value DESC,
             pd2.id DESC
    LIMIT 1
  )`;
}

function discountSelect(discountAlias = 'pd') {
  return `${discountAlias}.title AS discount_title,
          ${discountAlias}.scope AS discount_scope,
          ${discountAlias}.discount_type AS product_discount_type,
          ${discountAlias}.discount_value AS product_discount_value`;
}

function calculateDiscountPrice(originalPrice, discountType, discountValue) {
  const original = Number(originalPrice || 0);
  const value = Number(discountValue || 0);

  if (discountType === 'Percent') {
    return Math.max(0, Math.round((original * (100 - value)) / 100));
  }

  if (discountType === 'Fixed_Amount') {
    return Math.max(0, original - value);
  }

  return original;
}

function discountLabel(discountType, discountValue) {
  const value = Number(discountValue || 0);
  if (!value) return null;
  return discountType === 'Percent' ? `-${value}%` : `Giảm ${value.toLocaleString('vi-VN')}đ`;
}

function pricingForRow(row) {
  const originalPrice = Number(row.price || 0);
  const salePrice = calculateDiscountPrice(originalPrice, row.product_discount_type, row.product_discount_value);
  const hasDiscount = salePrice < originalPrice;

  return {
    price: hasDiscount ? salePrice : originalPrice,
    original_price: originalPrice,
    sale_price: salePrice,
    has_discount: hasDiscount,
    discount_title: hasDiscount ? row.discount_title : null,
    discount_scope: hasDiscount ? row.discount_scope : null,
    discount_type: hasDiscount ? row.product_discount_type : null,
    discount_value: hasDiscount ? Number(row.product_discount_value || 0) : 0,
    discount_label: hasDiscount ? discountLabel(row.product_discount_type, row.product_discount_value) : null
  };
}

function normalizeOption(value, fallback) {
  return String(value || fallback).trim() || fallback;
}

function parseToppingIds(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(
    source
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )].sort((a, b) => a - b);
}

function optionHash({ iceLevel, sugarLevel, toppingIds }) {
  const payload = JSON.stringify({
    ice: normalizeOption(iceLevel, DEFAULT_ICE_LEVEL),
    sugar: normalizeOption(sugarLevel, DEFAULT_SUGAR_LEVEL),
    toppings: parseToppingIds(toppingIds)
  });
  return crypto.createHash('sha1').update(payload).digest('hex');
}

async function getActiveToppings(ids = []) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await query(
    `SELECT p.id, p.name, p.price, pi.image_url,
            ${productOutOfStockExpression('p', 'stock_status')} AS is_out_of_stock,
            ${discountSelect('pd')}
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
     ${stockStatusJoin('p', 'stock_status')}
     ${activeDiscountJoin('p', 'pd')}
     WHERE p.is_active = TRUE
       AND c.name = 'Topping'
       AND p.id IN (${placeholders})
     ORDER BY FIELD(p.id, ${placeholders})`,
    [...ids, ...ids]
  );

  return rows.map((row) => ({ ...row, ...pricingForRow(row) }));
}

async function runRows(executor, sql, params = []) {
  if (typeof executor === 'function') {
    return executor(sql, params);
  }

  const [rows] = await executor.query(sql, params);
  return rows;
}

async function getProductAvailability(productId, variantId = null, quantity = 1, executor = query) {
  const requestedQuantity = Math.max(Number(quantity || 1), 1);
  const rows = await runRows(
    executor,
    `SELECT p.id, p.name, p.stock_quantity, p.recipe_required,
            EXISTS (
              SELECT 1
              FROM product_recipes required_recipe
              WHERE required_recipe.product_id = p.id
                AND required_recipe.is_optional = FALSE
            ) AS has_required_recipe,
            EXISTS (
              SELECT 1
              FROM product_recipes pr
              JOIN materials m ON m.id = pr.material_id
              WHERE pr.product_id = p.id
                AND pr.is_optional = FALSE
                AND (pr.variant_id IS NULL OR pr.variant_id <=> ?)
              GROUP BY pr.material_id
              HAVING MAX(CASE WHEN m.is_active = TRUE THEN m.stock_quantity ELSE 0 END)
                < SUM(pr.quantity * (1 + pr.loss_percent / 100) * ?)
            ) AS has_material_shortage
     FROM products p
     WHERE p.id = ?
       AND p.is_active = TRUE
     LIMIT 1`,
    [variantId || null, requestedQuantity, productId]
  );

  if (!rows.length) return null;
  const product = rows[0];

  return {
    ...product,
    is_out_of_stock: Number(product.stock_quantity || 0) <= 0
      || (Boolean(product.recipe_required) && (!product.has_required_recipe || Boolean(product.has_material_shortage)))
  };
}

async function assertProductAvailable(productId, variantId = null, quantity = 1, executor = query) {
  const requestedQuantity = Math.max(Number(quantity || 1), 1);
  const product = await getProductAvailability(productId, variantId, requestedQuantity, executor);

  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm.');
    error.statusCode = 404;
    throw error;
  }

  if (product.is_out_of_stock) {
    const error = new Error(`${product.name} đang hết hàng.`);
    error.statusCode = 400;
    throw error;
  }

  if (Number(product.stock_quantity || 0) < requestedQuantity) {
    const error = new Error(`${product.name} chỉ còn ${Number(product.stock_quantity || 0)} phần.`);
    error.statusCode = 400;
    throw error;
  }

  return product;
}

async function getAllToppings() {
  const rows = await query(
    `SELECT p.id, p.name, p.description, p.price, p.stock_quantity, pi.image_url,
            ${productOutOfStockExpression('p', 'stock_status')} AS is_out_of_stock,
            ${discountSelect('pd')}
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
     ${stockStatusJoin('p', 'stock_status')}
     ${activeDiscountJoin('p', 'pd')}
     WHERE p.is_active = TRUE
       AND c.name = 'Topping'
     ORDER BY p.price ASC, p.id ASC`
  );

  return rows.map((row) => ({ ...row, ...pricingForRow(row) }));
}

async function attachCartToppings(items) {
  const allIds = [...new Set(items.flatMap((item) => parseToppingIds(item.topping_ids)))];
  const toppings = await getActiveToppings(allIds);
  const toppingMap = new Map(toppings.map((item) => [Number(item.id), item]));

  return items.map((item) => {
    const itemToppings = parseToppingIds(item.topping_ids)
      .map((id) => toppingMap.get(id))
      .filter(Boolean);
    const productPricing = pricingForRow(item);
    const toppingTotal = itemToppings.reduce((sum, topping) => sum + Number(topping.price || 0), 0);
    const originalToppingTotal = itemToppings.reduce((sum, topping) => sum + Number(topping.original_price ?? topping.price ?? 0), 0);
    const baseUnitPrice = Number(productPricing.price || 0) + Number(item.price_adjustment || 0);
    const originalBaseUnitPrice = Number(productPricing.original_price || 0) + Number(item.price_adjustment || 0);
    const unitPrice = baseUnitPrice + toppingTotal;
    const originalUnitPrice = originalBaseUnitPrice + originalToppingTotal;

    const isToppingProduct = item.category_name === 'Topping';

    return {
      ...item,
      ...productPricing,
      ice_level: isToppingProduct ? null : item.ice_level || DEFAULT_ICE_LEVEL,
      sugar_level: isToppingProduct ? null : item.sugar_level || DEFAULT_SUGAR_LEVEL,
      topping_ids: parseToppingIds(item.topping_ids),
      toppings: itemToppings,
      topping_total: toppingTotal,
      base_unit_price: baseUnitPrice,
      original_base_unit_price: originalBaseUnitPrice,
      unit_price: unitPrice,
      original_unit_price: originalUnitPrice,
      subtotal: unitPrice * Number(item.quantity || 0)
    };
  });
}

function formatProductRows(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.id)) {
      const pricing = pricingForRow(row);
      const isBestSeller = row.automatic_is_best_seller ?? row.is_best_seller;
      const isOutOfStock = row.is_out_of_stock ?? row.automatic_is_out_of_stock;

      map.set(row.id, {
        id: row.id,
        category_id: row.category_id,
        category_name: row.category_name,
        name: row.name,
        description: row.description,
        ...pricing,
        barcode: row.barcode,
        stock_quantity: row.stock_quantity,
        min_stock_level: row.min_stock_level,
        view_count: row.view_count,
        sales_count: row.effective_sales_count ?? row.sales_count,
        is_best_seller: Boolean(isBestSeller),
        is_out_of_stock: Boolean(isOutOfStock),
        is_active: Boolean(row.is_active),
        image_url: row.image_url,
        variants: []
      });
    }

    if (row.variant_id) {
      map.get(row.id).variants.push({
        id: row.variant_id,
        variant_name: row.variant_name,
        price_adjustment: row.price_adjustment,
        is_out_of_stock: Boolean(row.variant_is_out_of_stock)
      });
    }
  });

  return [...map.values()].map((product) => ({
    ...product,
    is_out_of_stock: product.is_out_of_stock || (
      product.variants.length > 0 && product.variants.every((variant) => variant.is_out_of_stock)
    ),
    variants: product.variants.sort((a, b) => {
      const order = { M: 1, L: 2, XL: 3 };
      return (order[a.variant_name] || 99) - (order[b.variant_name] || 99)
        || Number(a.price_adjustment || 0) - Number(b.price_adjustment || 0)
        || Number(a.id) - Number(b.id);
    })
  }));
}

async function getProductRows(whereSql = '', params = []) {
  return query(
    `SELECT p.*, c.name AS category_name, pi.image_url,
            GREATEST(COALESCE(p.sales_count, 0), COALESCE(completed_sales.sold_quantity, 0)) AS effective_sales_count,
            (best_rank.id IS NOT NULL) AS automatic_is_best_seller,
            ${productOutOfStockExpression('p', 'stock_status')} AS automatic_is_out_of_stock,
            (${productOutOfStockExpression('p', 'stock_status')} OR ${variantOutOfStockExpression('p', 'pv')}) AS variant_is_out_of_stock,
            ${discountSelect('pd')},
            pv.id AS variant_id, pv.variant_name, pv.price_adjustment
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
     ${completedSalesJoin('p', 'completed_sales')}
     ${bestSellerRankJoin('p', 'best_rank')}
     ${stockStatusJoin('p', 'stock_status')}
     ${activeDiscountJoin('p', 'pd')}
     LEFT JOIN product_variants pv ON pv.product_id = p.id
     WHERE p.is_active = TRUE ${whereSql}
     ORDER BY automatic_is_best_seller DESC, effective_sales_count DESC, p.id ASC,
              CASE pv.variant_name WHEN 'M' THEN 1 WHEN 'L' THEN 2 WHEN 'XL' THEN 3 ELSE 99 END,
              pv.price_adjustment ASC, pv.id ASC`,
    params
  );
}

async function ensureCart(connection, userId) {
  const [carts] = await connection.query('SELECT id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
  if (carts.length) {
    return carts[0].id;
  }

  const [result] = await connection.query('INSERT INTO carts(user_id) VALUES (?)', [userId]);
  return result.insertId;
}

async function loadCart(userId) {
  const carts = await query('SELECT id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
  if (!carts.length) {
    return { id: null, items: [], subtotal: 0 };
  }

  const items = await query(
    `SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity,
            ci.ice_level, ci.sugar_level, ci.topping_ids, ci.option_hash,
            p.name, p.price, p.description, p.stock_quantity, c.name AS category_name,
            ${productOutOfStockExpression('p', 'stock_status')} AS is_out_of_stock,
            ${discountSelect('pd')},
            pi.image_url, pv.variant_name, COALESCE(pv.price_adjustment, 0) AS price_adjustment,
            (p.price + COALESCE(pv.price_adjustment, 0)) AS base_unit_price
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
     ${stockStatusJoin('p', 'stock_status')}
     ${activeDiscountJoin('p', 'pd')}
     LEFT JOIN product_variants pv ON pv.id = ci.variant_id
     WHERE ci.cart_id = ?
     ORDER BY ci.updated_at DESC, ci.id DESC`,
    [carts[0].id]
  );
  const enrichedItems = await attachCartToppings(items);

  return {
    id: carts[0].id,
    items: enrichedItems,
    subtotal: enrichedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
  };
}

async function getPromotion(code, subtotal, rank) {
  if (!code) {
    return null;
  }

  const promotions = await query(
    `SELECT *
     FROM promotions
     WHERE code = ?
       AND is_active = TRUE
       AND NOW() BETWEEN start_date AND end_date
       AND minimum_order_amount <= ?
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND (
         required_membership_rank IS NULL
         OR required_membership_rank = ?
         OR (required_membership_rank = 'Gold' AND ? = 'VIP')
       )
     LIMIT 1`,
    [code, subtotal, rank || 'Silver', rank || 'Silver']
  );

  if (!promotions.length) {
    return null;
  }

  const promotion = promotions[0];
  const discount =
    promotion.discount_type === 'Percent'
      ? Math.round((subtotal * promotion.discount_value) / 100)
      : Number(promotion.discount_value);

  return {
    ...promotion,
    discount_amount: Math.min(discount, subtotal)
  };
}

module.exports = {
  DEFAULT_ICE_LEVEL,
  DEFAULT_SUGAR_LEVEL,
  BEST_SELLER_LIMIT,
  bestSellerRankJoin,
  completedSalesJoin,
  stockStatusJoin,
  productOutOfStockExpression,
  normalizeOption,
  parseToppingIds,
  optionHash,
  activeDiscountJoin,
  discountSelect,
  getActiveToppings,
  getProductAvailability,
  assertProductAvailable,
  getAllToppings,
  attachCartToppings,
  formatProductRows,
  getProductRows,
  ensureCart,
  loadCart,
  getPromotion
};
