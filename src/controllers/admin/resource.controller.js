const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { buildInsert, buildUpdate } = require('../../utils/crud');
const { resourceDefinitions } = require('./resource.config');
const { getDefinition, getFilterConfig, buildListQuery, preparePayload } = require('./resource.helpers');
const {
  applyCreateAutomation,
  applyInventoryTransaction,
  applyUpdateAutomation,
  refreshMaterialCode,
  refreshMaterialImportTotals,
  removeManagedFields
} = require('./auto-fields.helpers');
const { refreshProductCodes, refreshProductCost } = require('./product.helpers');
const { refreshRevenueStatistics } = require('./revenue.helpers');

const revenueResources = new Set(['orders', 'order-details', 'payments']);

async function removeProduct(productId) {
  const orderRows = await query('SELECT COUNT(*) AS count FROM order_details WHERE product_id = ?', [productId]);
  const hasOrderHistory = Number(orderRows[0]?.count || 0) > 0;

  await query('DELETE FROM cart_items WHERE product_id = ?', [productId]);
  await query('DELETE FROM product_discounts WHERE product_id = ?', [productId]);

  if (hasOrderHistory) {
    await query('DELETE FROM product_recipes WHERE product_id = ?', [productId]);
    await query('UPDATE products SET is_active = FALSE, recipe_status = ? WHERE id = ?', ['Missing', productId]);
    await refreshProductCost(productId);
    return 'soft';
  }

  await query('DELETE FROM products WHERE id = ?', [productId]);
  return 'hard';
}

async function removeProductRecipe(recipeId) {
  const rows = await query('SELECT product_id FROM product_recipes WHERE id = ? LIMIT 1', [recipeId]);

  if (!rows.length) {
    const error = new Error('Không tìm thấy công thức cần xóa.');
    error.statusCode = 404;
    throw error;
  }

  await query('DELETE FROM product_recipes WHERE id = ?', [recipeId]);

  const productId = rows[0].product_id;
  await refreshProductCost(productId);

  const remainingRows = await query('SELECT COUNT(*) AS count FROM product_recipes WHERE product_id = ?', [productId]);
  await query(
    'UPDATE products SET recipe_status = ? WHERE id = ?',
    [Number(remainingRows[0]?.count || 0) > 0 ? 'Ready' : 'Missing', productId]
  );
}

const meta = asyncHandler(async (req, res) => {
  res.json({
    resources: Object.keys(resourceDefinitions).map((key) => {
      const definition = resourceDefinitions[key];
      const filterConfig = getFilterConfig(key, definition);

      return {
        key,
        table: definition.table,
        fields: definition.fields,
        readOnly: Boolean(definition.readOnly),
        searchColumns: filterConfig.searchColumns,
        dateColumn: filterConfig.dateColumn,
        statusColumn: filterConfig.statusColumn
      };
    })
  });
});

const list = asyncHandler(async (req, res) => {
  const definition = getDefinition(req.params.resource);
  const listQuery = buildListQuery(req.params.resource, definition, req.query);
  const rows = await query(listQuery.sql, listQuery.values);

  res.json({ data: rows });
});

const getById = asyncHandler(async (req, res) => {
  const definition = getDefinition(req.params.resource);
  const rows = await query(`SELECT * FROM \`${definition.table}\` WHERE id = ?`, [req.params.id]);

  if (!rows.length) {
    return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  }

  res.json({ data: rows[0] });
});

const create = asyncHandler(async (req, res) => {
  const definition = getDefinition(req.params.resource);

  if (definition.readOnly) {
    return res.status(400).json({ message: 'Bảng thống kê chỉ dùng để xem.' });
  }

  const data = applyCreateAutomation(req.params.resource, preparePayload(req.params.resource, req.body), req);

  if (!Object.keys(data).length) {
    return res.status(400).json({ message: 'Không có trường hợp lệ để thêm.' });
  }

  const insert = buildInsert(definition.table, data);
  const result = await query(insert.sql, insert.values);

  if (req.params.resource === 'products') {
    await refreshProductCodes(result.insertId);

    const imageUrl = String(req.body.image_url || '').trim();
    if (imageUrl) {
      await query(
        `INSERT INTO product_images(product_id, image_url, is_primary, display_order)
         VALUES (?, ?, TRUE, 1)`,
        [result.insertId, imageUrl]
      );
    }

    const categoryRows = data.category_id
      ? await query('SELECT name FROM categories WHERE id = ? LIMIT 1', [data.category_id])
      : [];
    const isTopping = categoryRows[0]?.name === 'Topping';

    if (!isTopping) {
      await query(
        `INSERT INTO product_variants(product_id, variant_name, price_adjustment, recipe_multiplier, cup_volume_ml, display_order)
         VALUES (?, 'M', 0, 1, 500, 1), (?, 'L', 7000, 1.25, 700, 2), (?, 'XL', 12000, 1.5, 900, 3)`,
        [result.insertId, result.insertId, result.insertId]
      );
    }
  }

  if (req.params.resource === 'materials') {
    await refreshMaterialCode(result.insertId, true);
  }

  if (req.params.resource === 'product-recipes') {
    await refreshProductCost(data.product_id);
  }

  if (req.params.resource === 'import-details') {
    const imports = await query('SELECT status, admin_id FROM material_imports WHERE id = ? LIMIT 1', [data.import_id]);
    if (imports[0]?.status === 'Received') {
      await query('CALL receive_material_import_detail(?, ?)', [result.insertId, req.user.id || imports[0].admin_id]);
    }
    await refreshMaterialImportTotals(data.import_id);
  }

  if (req.params.resource === 'inventory-transactions') {
    await applyInventoryTransaction(result.insertId);
  }

  if (revenueResources.has(req.params.resource)) {
    await refreshRevenueStatistics();
  }

  await query(
    'INSERT INTO activity_logs(user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      req.user.id,
      `Thêm dữ liệu ${definition.table} #${result.insertId}`,
      definition.table,
      result.insertId,
      req.ip,
      req.get('user-agent')
    ]
  );

  res.status(201).json({ id: result.insertId, message: 'Đã thêm dữ liệu.' });
});

const update = asyncHandler(async (req, res) => {
  const definition = getDefinition(req.params.resource);

  if (definition.readOnly) {
    return res.status(400).json({ message: 'Bảng thống kê chỉ dùng để xem.' });
  }

  const data = await applyUpdateAutomation(req.params.resource, preparePayload(req.params.resource, req.body, true), req, req.params.id);
  const imageUrl = req.params.resource === 'products' ? String(req.body.image_url || '').trim() : '';
  const existingRecipeRows = req.params.resource === 'product-recipes'
    ? await query('SELECT product_id FROM product_recipes WHERE id = ? LIMIT 1', [req.params.id])
    : [];
  const existingImportDetailRows = req.params.resource === 'import-details'
    ? await query('SELECT import_id FROM import_details WHERE id = ? LIMIT 1', [req.params.id])
    : [];

  if (req.params.resource === 'products') {
    removeManagedFields(req.params.resource, data);
  }

  if (!Object.keys(data).length && !imageUrl) {
    return res.status(400).json({ message: 'Không có trường hợp lệ để cập nhật.' });
  }

  const updateSql = buildUpdate(definition.table, data);
  if (Object.keys(data).length) {
    await query(updateSql.sql, [...updateSql.values, req.params.id]);
  }

  if (req.params.resource === 'products') {
    if (Object.prototype.hasOwnProperty.call(data, 'category_id')) {
      await refreshProductCodes(req.params.id);
    }

    if (imageUrl) {
      await query('UPDATE product_images SET is_primary = FALSE WHERE product_id = ?', [req.params.id]);
      await query(
        `INSERT INTO product_images(product_id, image_url, is_primary, display_order)
         VALUES (?, ?, TRUE, 1)`,
        [req.params.id, imageUrl]
      );
    }
  }

  if (req.params.resource === 'materials') {
    await refreshMaterialCode(req.params.id);
  }

  if (req.params.resource === 'product-recipes') {
    const touchedProductIds = [
      existingRecipeRows[0]?.product_id,
      data.product_id || req.body.product_id
    ]
      .filter(Boolean)
      .map(Number);

    for (const productId of [...new Set(touchedProductIds)]) {
      await refreshProductCost(productId);
    }
  }

  if (req.params.resource === 'import-details') {
    const touchedImportIds = [
      existingImportDetailRows[0]?.import_id,
      data.import_id || req.body.import_id
    ]
      .filter(Boolean)
      .map(Number);

    for (const importId of [...new Set(touchedImportIds)]) {
      await refreshMaterialImportTotals(importId);
    }
  }

  if (revenueResources.has(req.params.resource)) {
    await refreshRevenueStatistics();
  }

  await query(
    'INSERT INTO activity_logs(user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      req.user.id,
      `Cập nhật dữ liệu ${definition.table} #${req.params.id}`,
      definition.table,
      req.params.id,
      req.ip,
      req.get('user-agent')
    ]
  );

  res.json({ message: 'Đã cập nhật dữ liệu.' });
});

const remove = asyncHandler(async (req, res) => {
  const definition = getDefinition(req.params.resource);

  if (definition.readOnly) {
    return res.status(400).json({ message: 'Bảng thống kê chỉ dùng để xem.' });
  }

  if (req.params.resource === 'products') {
    await removeProduct(req.params.id);
  } else if (req.params.resource === 'product-recipes') {
    await removeProductRecipe(req.params.id);
  } else if (req.params.resource === 'import-details') {
    const rows = await query('SELECT import_id FROM import_details WHERE id = ? LIMIT 1', [req.params.id]);
    await query(`DELETE FROM \`${definition.table}\` WHERE id = ?`, [req.params.id]);
    if (rows[0]?.import_id) {
      await refreshMaterialImportTotals(rows[0].import_id);
    }
  } else {
    await query(`DELETE FROM \`${definition.table}\` WHERE id = ?`, [req.params.id]);
  }

  if (revenueResources.has(req.params.resource)) {
    await refreshRevenueStatistics();
  }

  await query(
    'INSERT INTO activity_logs(user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      req.user.id,
      `Xóa dữ liệu ${definition.table} #${req.params.id}`,
      definition.table,
      req.params.id,
      req.ip,
      req.get('user-agent')
    ]
  );

  res.json({ message: 'Đã xóa dữ liệu.' });
});

module.exports = {
  meta,
  list,
  getById,
  create,
  update,
  remove
};
