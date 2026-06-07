const crypto = require('crypto');
const { query } = require('../../config/db');

const managedFieldsByResource = {
  products: ['base_cost', 'barcode', 'sku', 'view_count', 'sales_count'],
  materials: ['material_code', 'stock_quantity', 'last_import_price', 'average_cost', 'stock_value'],
  'material-imports': ['import_code', 'admin_id', 'total_amount', 'paid_amount', 'expected_date', 'invoice_number'],
  'import-details': ['batch_code', 'subtotal'],
  'material-batches': ['batch_code', 'remaining_quantity'],
  'inventory-transactions': ['stock_after', 'created_by'],
  promotions: ['code', 'used_count'],
  'member-gift-codes': ['code', 'used_count'],
  payments: ['transaction_code', 'paid_at'],
  'news-posts': ['slug'],
  'cart-items': ['option_hash'],
  orders: ['total_amount']
};

const materialTypePrefixes = {
  Tea_Base: 'TEA',
  Milk_Base: 'MILK',
  Sweetener: 'SWEET',
  Topping: 'TOP',
  Fruit: 'FRU',
  Powder: 'POW',
  Cream: 'CREAM',
  Packaging: 'PKG',
  Other: 'OTH'
};

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function dateOnly(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function expectedDateAfterImport(importDate) {
  const date = importDate ? new Date(importDate) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  safeDate.setDate(safeDate.getDate() + 2 + Math.floor(Math.random() * 4));
  return dateOnly(safeDate);
}

function slugify(value, fallback = 'tu-dong') {
  const text = String(value || '')
    .trim()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return text || fallback;
}

function compactCode(value, fallback = 'AUTO') {
  const text = slugify(value, fallback)
    .replace(/-/g, '')
    .toUpperCase()
    .slice(0, 16);

  return text || fallback;
}

function codeSuffix() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36).padStart(2, '0')}`.toUpperCase();
}

function makeCode(prefix, value, maxLength = 50) {
  return `${prefix}-${compactCode(value)}-${codeSuffix()}`.slice(0, maxLength);
}

function paymentCode(orderId) {
  return makeCode(`PAY${orderId ? `-${orderId}` : ''}`, 'order', 100);
}

function optionHash(data) {
  return crypto.createHash('sha1').update(JSON.stringify({
    ice: data.ice_level || 'Binh thuong',
    sugar: data.sugar_level || 'Binh thuong',
    toppings: data.topping_ids || ''
  })).digest('hex');
}

function getManagedFields(resource) {
  return new Set(managedFieldsByResource[resource] || []);
}

function removeManagedFields(resource, data, exceptions = []) {
  const keep = new Set(exceptions);
  getManagedFields(resource).forEach((field) => {
    if (!keep.has(field)) delete data[field];
  });
  return data;
}

function applyCreateAutomation(resource, data, req) {
  if (resource === 'products') {
    removeManagedFields(resource, data);
    data.price = Number(data.price || 0);
    data.view_count = 0;
    data.sales_count = 0;
  }

  if (resource === 'materials') {
    removeManagedFields(resource, data);
  }

  if (resource === 'material-imports') {
    const totalAmount = Number(data.total_amount || 0);
    const paidAmount = data.paid_amount === null || data.paid_amount === undefined
      ? totalAmount
      : Number(data.paid_amount || 0);
    removeManagedFields(resource, data);
    data.admin_id = req.user.id;
    data.total_amount = totalAmount;
    data.paid_amount = paidAmount;
    data.expected_date = expectedDateAfterImport(data.import_date);
    data.invoice_number = makeCode('INV', data.supplier_id || 'NCC', 100);
  }

  if (resource === 'import-details') {
    removeManagedFields(resource, data);
    data.subtotal = Number(data.quantity || 0) * Number(data.unit_price || 0);
  }

  if (resource === 'material-batches') {
    removeManagedFields(resource, data);
    data.batch_code = makeCode('LOT', data.material_id || 'BATCH', 100);
    data.remaining_quantity = Number(data.initial_quantity || 0);
  }

  if (resource === 'promotions') {
    removeManagedFields(resource, data);
    data.code = makeCode('KM', data.title);
    data.used_count = 0;
  }

  if (resource === 'member-gift-codes') {
    removeManagedFields(resource, data);
    data.code = makeCode('GIFT', data.title);
    data.used_count = 0;
  }

  if (resource === 'payments') {
    removeManagedFields(resource, data);
    if (data.status === 'Paid') {
      data.transaction_code = paymentCode(data.order_id);
      data.paid_at = data.paid_at || nowSql();
    }
  }

  if (resource === 'orders') {
    removeManagedFields(resource, data);
    data.subtotal = Number(data.subtotal || 0);
    data.discount_amount = Number(data.discount_amount || 0);
    data.total_amount = Math.max(data.subtotal - data.discount_amount, 0);
  }

  if (resource === 'news-posts') {
    removeManagedFields(resource, data);
    data.slug = `${slugify(data.title, 'bai-viet')}-${codeSuffix().toLowerCase()}`;
  }

  if (resource === 'cart-items') {
    removeManagedFields(resource, data);
    data.option_hash = optionHash(data);
  }

  if (resource === 'inventory-transactions') {
    removeManagedFields(resource, data);
    data.created_by = req.user.id;
    data.stock_after = 0;
  }

  if (resource === 'order-details') {
    data.subtotal = Number(data.quantity || 0) * Number(data.unit_price || 0);
  }

  return data;
}

async function applyUpdateAutomation(resource, data, req, id) {
  removeManagedFields(resource, data);

  if (resource === 'payments' && data.status === 'Paid') {
    const rows = await query('SELECT order_id, transaction_code, paid_at FROM payments WHERE id = ? LIMIT 1', [id]);
    data.transaction_code = rows[0]?.transaction_code || paymentCode(data.order_id || rows[0]?.order_id);
    data.paid_at = rows[0]?.paid_at || nowSql();
  }

  if (resource === 'orders' && ('subtotal' in data || 'discount_amount' in data || 'total_amount' in data)) {
    const rows = await query('SELECT subtotal, discount_amount, total_amount FROM orders WHERE id = ? LIMIT 1', [id]);
    const subtotal = Number(data.subtotal ?? rows[0]?.subtotal ?? 0);
    const discount = Number(data.discount_amount ?? rows[0]?.discount_amount ?? 0);
    data.total_amount = Number(data.total_amount || Math.max(subtotal - discount, 0));
  }

  if (resource === 'cart-items') {
    const rows = await query('SELECT ice_level, sugar_level, topping_ids FROM cart_items WHERE id = ? LIMIT 1', [id]);
    data.option_hash = optionHash({ ...rows[0], ...data });
  }

  if (resource === 'order-details' && ('quantity' in data || 'unit_price' in data)) {
    const rows = await query('SELECT quantity, unit_price FROM order_details WHERE id = ? LIMIT 1', [id]);
    const quantity = Number(data.quantity ?? rows[0]?.quantity ?? 0);
    const unitPrice = Number(data.unit_price ?? rows[0]?.unit_price ?? 0);
    data.subtotal = quantity * unitPrice;
  }

  if (resource === 'import-details' && ('quantity' in data || 'unit_price' in data)) {
    const rows = await query('SELECT quantity, unit_price FROM import_details WHERE id = ? LIMIT 1', [id]);
    const quantity = Number(data.quantity ?? rows[0]?.quantity ?? 0);
    const unitPrice = Number(data.unit_price ?? rows[0]?.unit_price ?? 0);
    data.subtotal = quantity * unitPrice;
  }

  return data;
}

async function applyInventoryTransaction(resultId) {
  const rows = await query(
    `SELECT it.id, it.material_id, it.quantity_change, m.stock_quantity
     FROM inventory_transactions it
     JOIN materials m ON m.id = it.material_id
     WHERE it.id = ?
     LIMIT 1`,
    [resultId]
  );

  if (!rows.length) return;

  const stockAfter = Number(rows[0].stock_quantity || 0) + Number(rows[0].quantity_change || 0);
  await query('UPDATE inventory_transactions SET stock_after = ? WHERE id = ?', [stockAfter, resultId]);
  await query(
    `UPDATE materials
     SET stock_quantity = ?,
         stock_value = ? * COALESCE(NULLIF(average_cost, 0), NULLIF(last_import_price, 0), 0)
     WHERE id = ?`,
    [stockAfter, stockAfter, rows[0].material_id]
  );
}

async function refreshMaterialImportTotals(importId) {
  if (!importId) return;

  await query(
    `UPDATE material_imports mi
     LEFT JOIN (
       SELECT import_id, SUM(subtotal) AS total_amount
       FROM import_details
       WHERE import_id = ?
       GROUP BY import_id
     ) totals ON totals.import_id = mi.id
     SET mi.total_amount = COALESCE(totals.total_amount, 0),
         mi.paid_amount = CASE
           WHEN mi.status = 'Received' THEN COALESCE(totals.total_amount, 0)
           ELSE LEAST(mi.paid_amount, COALESCE(totals.total_amount, 0))
         END
     WHERE mi.id = ?`,
    [importId, importId]
  );
}

async function refreshMaterialCode(materialId, force = false) {
  const rows = await query('SELECT material_type FROM materials WHERE id = ? LIMIT 1', [materialId]);
  if (!rows.length) return;

  const prefix = materialTypePrefixes[rows[0].material_type] || materialTypePrefixes.Other;
  const sql = force
    ? 'UPDATE materials SET material_code = ? WHERE id = ?'
    : `UPDATE materials
       SET material_code = ?
       WHERE id = ? AND (material_code IS NULL OR material_code = '')`;

  await query(sql, [`MAT-${prefix}-${String(materialId).padStart(5, '0')}`, materialId]);
}

module.exports = {
  applyCreateAutomation,
  applyInventoryTransaction,
  applyUpdateAutomation,
  getManagedFields,
  makeCode,
  paymentCode,
  refreshMaterialImportTotals,
  refreshMaterialCode,
  removeManagedFields,
  slugify
};
