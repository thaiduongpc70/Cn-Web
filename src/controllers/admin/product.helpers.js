const { query } = require('../../config/db');

const PRICE_MULTIPLIER = 2.2;

function run(executor, sql, params = []) {
  if (typeof executor === 'function') {
    return executor(sql, params);
  }

  return executor.query(sql, params).then(([rows]) => rows);
}

function normalizeCode(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .toUpperCase();
}

function categoryShortCode(categoryName) {
  const normalized = normalizeCode(categoryName);
  const known = {
    'TRA SUA': 'TS',
    'TRA TRAI CAY': 'TC',
    'SUA TUOI': 'ST',
    'DA XAY': 'DX',
    TOPPING: 'TP'
  };

  if (known[normalized]) return known[normalized];

  const initials = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('');

  return (initials || 'SP').slice(0, 3);
}

function buildProductCodes(productId, categoryName) {
  const categoryCode = categoryShortCode(categoryName);
  const kindCode = categoryCode === 'TP' ? 'TOP' : 'DRK';
  const numericId = String(productId).padStart(5, '0');

  return {
    sku: `${kindCode}-${categoryCode}-${numericId}`,
    barcode: `893${String(productId).padStart(10, '0')}`
  };
}

function suggestedPriceFromCost(baseCost) {
  const raw = Number(baseCost || 0) * PRICE_MULTIPLIER;
  if (!raw) return 0;
  return Math.ceil(raw / 1000) * 1000;
}

async function refreshProductCodes(productId, executor = query) {
  const rows = await run(
    executor,
    `SELECT p.id, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?
     LIMIT 1`,
    [productId]
  );

  if (!rows.length) return null;

  const codes = buildProductCodes(rows[0].id, rows[0].category_name);
  await run(
    executor,
    'UPDATE products SET sku = ?, barcode = ? WHERE id = ?',
    [codes.sku, codes.barcode, productId]
  );

  return codes;
}

async function calculateProductCost(productId, executor = query) {
  const rows = await run(
    executor,
    `SELECT COALESCE(SUM(
              pr.quantity
              * (1 + pr.loss_percent / 100)
              * COALESCE(NULLIF(m.average_cost, 0), NULLIF(m.last_import_price, 0), 0)
            ), 0) AS base_cost
     FROM product_recipes pr
     JOIN materials m ON m.id = pr.material_id
     LEFT JOIN product_variants pv ON pv.id = pr.variant_id
     WHERE pr.product_id = ?
       AND (pr.variant_id IS NULL OR pv.variant_name = 'M')`,
    [productId]
  );

  return Number(rows[0]?.base_cost || 0);
}

async function refreshProductCost(productId, executor = query) {
  const baseCost = await calculateProductCost(productId, executor);
  const suggestedPrice = suggestedPriceFromCost(baseCost);

  await run(
    executor,
    `UPDATE products
     SET base_cost = ?,
         price = CASE WHEN price IS NULL OR price <= 0 THEN ? ELSE price END
     WHERE id = ?`,
    [baseCost, suggestedPrice, productId]
  );

  return {
    base_cost: baseCost,
    suggested_price: suggestedPrice
  };
}

module.exports = {
  PRICE_MULTIPLIER,
  buildProductCodes,
  calculateProductCost,
  refreshProductCodes,
  refreshProductCost,
  suggestedPriceFromCost
};
