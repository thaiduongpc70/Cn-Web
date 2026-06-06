const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { buildInsert, buildUpdate } = require('../../utils/crud');
const { resourceDefinitions } = require('./resource.config');
const { getDefinition, getFilterConfig, buildListQuery, preparePayload } = require('./resource.helpers');

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

  const data = preparePayload(req.params.resource, req.body);

  if (!Object.keys(data).length) {
    return res.status(400).json({ message: 'Không có trường hợp lệ để thêm.' });
  }

  const insert = buildInsert(definition.table, data);
  const result = await query(insert.sql, insert.values);

  if (req.params.resource === 'products') {
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

  const data = preparePayload(req.params.resource, req.body, true);
  const imageUrl = req.params.resource === 'products' ? String(req.body.image_url || '').trim() : '';

  if (!Object.keys(data).length && !imageUrl) {
    return res.status(400).json({ message: 'Không có trường hợp lệ để cập nhật.' });
  }

  const updateSql = buildUpdate(definition.table, data);
  if (Object.keys(data).length) {
    await query(updateSql.sql, [...updateSql.values, req.params.id]);
  }

  if (req.params.resource === 'products') {
    if (imageUrl) {
      await query('UPDATE product_images SET is_primary = FALSE WHERE product_id = ?', [req.params.id]);
      await query(
        `INSERT INTO product_images(product_id, image_url, is_primary, display_order)
         VALUES (?, ?, TRUE, 1)`,
        [req.params.id, imageUrl]
      );
    }
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
    await query('UPDATE products SET is_active = FALSE WHERE id = ?', [req.params.id]);
  } else {
    await query(`DELETE FROM \`${definition.table}\` WHERE id = ?`, [req.params.id]);
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