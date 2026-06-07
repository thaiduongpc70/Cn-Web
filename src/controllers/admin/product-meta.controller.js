const { query, transaction } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { refreshProductCost, suggestedPriceFromCost } = require('./product.helpers');
const { recipeProcessSteps, recipeTemplates } = require('./recipe.templates');

async function loadRecipeChoiceData() {
  const [
    products,
    materials,
    variants,
    categories,
    roles,
    users,
    customerProfiles,
    membershipTiers,
    suppliers,
    materialImports,
    importDetails,
    materialBatches,
    orders,
    drivers,
    promotions,
    carts,
    chatSessions
  ] = await Promise.all([
    query('SELECT id, name, category_id, base_cost, price FROM products WHERE is_active = TRUE ORDER BY name ASC'),
    query('SELECT id, name, material_code, material_type, unit, recipe_unit, average_cost, last_import_price FROM materials WHERE is_active = TRUE ORDER BY material_type ASC, name ASC'),
    query(`SELECT pv.id, pv.product_id, pv.variant_name, pv.recipe_multiplier, pv.cup_volume_ml
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id
           WHERE p.is_active = TRUE
           ORDER BY pv.product_id ASC, pv.display_order ASC, pv.id ASC`),
    query('SELECT id, name FROM categories ORDER BY name ASC'),
    query('SELECT id, name FROM roles ORDER BY id ASC'),
    query(`SELECT u.id, u.username, r.name AS role_name, cp.full_name, cp.phone
           FROM users u
           LEFT JOIN roles r ON r.id = u.role_id
           LEFT JOIN customer_profiles cp ON cp.user_id = u.id
           ORDER BY u.id DESC
           LIMIT 1000`),
    query(`SELECT cp.id, cp.user_id, u.username, cp.full_name, cp.phone, cp.membership_rank
           FROM customer_profiles cp
           JOIN users u ON u.id = cp.user_id
           ORDER BY cp.id DESC
           LIMIT 1000`),
    query('SELECT id, rank_name, min_points, discount_percent FROM membership_tiers WHERE is_active = TRUE ORDER BY min_points ASC'),
    query('SELECT id, name, contact_name, phone FROM suppliers WHERE is_active = TRUE ORDER BY name ASC'),
    query(`SELECT mi.id, mi.import_code, mi.supplier_id, s.name AS supplier_name, mi.import_date, mi.status
           FROM material_imports mi
           LEFT JOIN suppliers s ON s.id = mi.supplier_id
           ORDER BY mi.import_date DESC, mi.id DESC
           LIMIT 1000`),
    query(`SELECT idt.id, idt.import_id, mi.import_code, idt.material_id, m.name AS material_name, idt.batch_code
           FROM import_details idt
           JOIN material_imports mi ON mi.id = idt.import_id
           JOIN materials m ON m.id = idt.material_id
           ORDER BY idt.id DESC
           LIMIT 1000`),
    query(`SELECT mb.id, mb.material_id, m.name AS material_name, mb.batch_code, mb.remaining_quantity
           FROM material_batches mb
           JOIN materials m ON m.id = mb.material_id
           ORDER BY mb.is_closed ASC, mb.expiry_date IS NULL ASC, mb.expiry_date ASC, mb.id DESC
           LIMIT 1000`),
    query(`SELECT o.id, o.receiver_name, o.receiver_phone, o.total_amount, o.status, o.created_at
           FROM orders o
           ORDER BY o.created_at DESC, o.id DESC
           LIMIT 1000`),
    query('SELECT id, name, phone, vehicle_type, license_plate FROM drivers WHERE is_active = TRUE ORDER BY name ASC'),
    query('SELECT id, code, title, discount_type, discount_value, end_date FROM promotions WHERE is_active = TRUE ORDER BY end_date DESC, id DESC'),
    query(`SELECT c.id, c.user_id, u.username, cp.full_name
           FROM carts c
           JOIN users u ON u.id = c.user_id
           LEFT JOIN customer_profiles cp ON cp.user_id = u.id
           ORDER BY c.updated_at DESC
           LIMIT 1000`),
    query(`SELECT cs.id, cs.user_id, cs.title, u.username, cp.full_name
           FROM chat_sessions cs
           LEFT JOIN users u ON u.id = cs.user_id
           LEFT JOIN customer_profiles cp ON cp.user_id = u.id
           ORDER BY cs.started_at DESC
           LIMIT 1000`)
  ]);

  return {
    categories,
    products,
    materials,
    variants,
    roles,
    users,
    customer_profiles: customerProfiles,
    membership_tiers: membershipTiers,
    suppliers,
    material_imports: materialImports,
    import_details: importDetails,
    material_batches: materialBatches,
    orders,
    drivers,
    promotions,
    carts,
    chat_sessions: chatSessions,
    process_steps: recipeProcessSteps,
    recipe_templates: recipeTemplates.map(({ id, name, description }) => ({ id, name, description }))
  };
}

const productFormOptions = asyncHandler(async (req, res) => {
  res.json({ data: await loadRecipeChoiceData() });
});

const productCostPreview = asyncHandler(async (req, res) => {
  const cost = await refreshProductCost(req.params.id);

  res.json({
    data: {
      ...cost,
      suggested_price: suggestedPriceFromCost(cost.base_cost)
    }
  });
});

const createRecipeFromTemplate = asyncHandler(async (req, res) => {
  const productId = Number(req.body.product_id);
  const template = recipeTemplates.find((item) => item.id === req.body.template_id);

  if (!productId || !template) {
    return res.status(400).json({ message: 'Vui lòng chọn sản phẩm và mẫu công thức.' });
  }

  const created = await transaction(async (connection) => {
    const [products] = await connection.query('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
    if (!products.length) {
      const error = new Error('Không tìm thấy sản phẩm.');
      error.statusCode = 404;
      throw error;
    }

    const [materials] = await connection.query('SELECT id, material_code FROM materials WHERE is_active = TRUE');
    const materialByCode = new Map(materials.map((item) => [item.material_code, item.id]));
    const [variants] = await connection.query('SELECT id, variant_name FROM product_variants WHERE product_id = ?', [productId]);
    const variantByName = new Map(variants.map((item) => [item.variant_name, item.id]));

    await connection.query('DELETE FROM product_recipes WHERE product_id = ?', [productId]);

    let count = 0;
    for (const line of template.lines) {
      const materialId = materialByCode.get(line.material_code);
      const variantId = line.variant ? variantByName.get(line.variant) : null;

      if (!materialId || (line.variant && !variantId)) {
        continue;
      }

      await connection.query(
        `INSERT INTO product_recipes(product_id, variant_id, material_id, step_name, step_order, quantity, loss_percent, is_optional, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
        [
          productId,
          variantId,
          materialId,
          line.step_name,
          line.step_order,
          line.quantity,
          line.loss_percent,
          line.note || null
        ]
      );
      count += 1;
    }

    await refreshProductCost(productId, connection);
    await connection.query("UPDATE products SET recipe_status = 'Ready' WHERE id = ?", [productId]);

    return count;
  });

  res.status(201).json({ message: `Đã tạo ${created} dòng công thức từ mẫu.` });
});

module.exports = {
  createRecipeFromTemplate,
  productCostPreview,
  productFormOptions
};
