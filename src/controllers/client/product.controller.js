const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { getProductRows, formatProductRows, getAllToppings } = require('./shop.helpers');

const products = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];

  if (req.query.category_id) {
    where.push('AND p.category_id = ?');
    params.push(req.query.category_id);
  }

  if (req.query.q) {
    where.push('AND (p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }

  const rows = await getProductRows(where.join(' '), params);
  res.json({ data: formatProductRows(rows) });
});

const productDetail = asyncHandler(async (req, res) => {
  await query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
  const rows = await getProductRows('AND p.id = ?', [req.params.id]);

  if (!rows.length) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  }

  const recipes = await query(
    `SELECT pr.*, m.name AS material_name, m.unit
     FROM product_recipes pr
     JOIN materials m ON m.id = pr.material_id
     WHERE pr.product_id = ?
     ORDER BY pr.id ASC`,
    [req.params.id]
  );
  const toppings = await getAllToppings();

  res.json({ data: { ...formatProductRows(rows)[0], recipes, toppings } });
});

module.exports = {
  products,
  productDetail
};