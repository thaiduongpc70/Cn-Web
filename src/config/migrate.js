const { columnExists, indexExists, query, tableExists } = require('./db');
const crypto = require('crypto');

function defaultOptionHash() {
  return crypto.createHash('sha1').update(JSON.stringify({
    ice: 'Bình thường',
    sugar: 'Bình thường',
    toppings: []
  })).digest('hex');
}

async function ensureCartOptionColumns() {
  const columns = [
    ['ice_level', "ALTER TABLE cart_items ADD COLUMN ice_level VARCHAR(50) NULL DEFAULT 'Bình thường' AFTER quantity"],
    ['sugar_level', "ALTER TABLE cart_items ADD COLUMN sugar_level VARCHAR(50) NULL DEFAULT 'Bình thường' AFTER ice_level"],
    ['topping_ids', 'ALTER TABLE cart_items ADD COLUMN topping_ids TEXT NULL AFTER sugar_level'],
    ['option_hash', "ALTER TABLE cart_items ADD COLUMN option_hash VARCHAR(64) NOT NULL DEFAULT '' AFTER topping_ids"]
  ];

  for (const [columnName, sql] of columns) {
    if (!(await columnExists('cart_items', columnName))) {
      await query(sql);
    }
  }

  await query("UPDATE cart_items SET option_hash = ? WHERE option_hash = '' OR option_hash IS NULL", [defaultOptionHash()]);

  if (!(await indexExists('cart_items', 'idx_cartitem_options'))) {
    await query('ALTER TABLE cart_items ADD INDEX idx_cartitem_options(cart_id, product_id, variant_id, option_hash)');
  }

  if (await indexExists('cart_items', 'cart_id')) {
    await query('ALTER TABLE cart_items DROP INDEX cart_id');
  }
}

async function ensureProductDiscountTable() {
  if (!(await tableExists('product_discounts'))) {
    await query(
      `CREATE TABLE product_discounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        scope ENUM('Category', 'Product') NOT NULL,
        category_id INT NULL,
        product_id INT NULL,
        discount_type ENUM('Percent', 'Fixed_Amount') NOT NULL DEFAULT 'Percent',
        discount_value DECIMAL(10,2) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        priority INT NOT NULL DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_product_discount_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
        CONSTRAINT fk_product_discount_product FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT chk_product_discount_value CHECK(discount_value > 0),
        CONSTRAINT chk_product_discount_percent CHECK(discount_type <> 'Percent' OR discount_value <= 100),
        CONSTRAINT chk_product_discount_scope CHECK(
          (scope = 'Category' AND category_id IS NOT NULL AND product_id IS NULL)
          OR (scope = 'Product' AND product_id IS NOT NULL AND category_id IS NULL)
        ),
        CONSTRAINT chk_product_discount_dates CHECK(end_date > start_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  }

  const indexes = [
    ['idx_product_discount_category', 'ALTER TABLE product_discounts ADD INDEX idx_product_discount_category(category_id, is_active, start_date, end_date)'],
    ['idx_product_discount_product', 'ALTER TABLE product_discounts ADD INDEX idx_product_discount_product(product_id, is_active, start_date, end_date)'],
    ['idx_product_discount_scope', 'ALTER TABLE product_discounts ADD INDEX idx_product_discount_scope(scope, is_active, priority)']
  ];

  for (const [indexName, sql] of indexes) {
    if (!(await indexExists('product_discounts', indexName))) {
      await query(sql);
    }
  }
}

async function runMigrations() {
  await ensureCartOptionColumns();
  await ensureProductDiscountTable();
  if (await columnExists('products', 'is_best_seller')) {
    await query('UPDATE products SET is_best_seller = FALSE WHERE is_best_seller <> FALSE');
  }
}

module.exports = {
  runMigrations
};
