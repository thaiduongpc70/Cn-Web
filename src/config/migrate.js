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

async function ensureProductRollupRoutine() {
  await query('DROP PROCEDURE IF EXISTS refresh_product_rollups');
  await query(`
    CREATE PROCEDURE refresh_product_rollups()
    BEGIN
      UPDATE products p
      LEFT JOIN categories c ON c.id = p.category_id
      SET p.sku = CONCAT(
              CASE WHEN c.name = 'Topping' THEN 'TOP' ELSE 'DRK' END,
              '-',
              CASE
                  WHEN c.name = 'Trà sữa' THEN 'TS'
                  WHEN c.name = 'Trà trái cây' THEN 'TC'
                  WHEN c.name = 'Sữa tươi' THEN 'ST'
                  WHEN c.name = 'Đá xay' THEN 'DX'
                  WHEN c.name = 'Topping' THEN 'TP'
                  ELSE 'SP'
              END,
              '-',
              LPAD(p.id, 5, '0')
          ),
          p.barcode = CONCAT('893', LPAD(p.id, 10, '0'));

      UPDATE products p
      LEFT JOIN (
          SELECT
              pr.product_id,
              SUM(
                  pr.quantity
                  * (1 + pr.loss_percent / 100)
                  * COALESCE(NULLIF(m.average_cost, 0), NULLIF(m.last_import_price, 0), 0)
              ) AS computed_cost
          FROM product_recipes pr
          JOIN materials m ON m.id = pr.material_id
          LEFT JOIN product_variants pv ON pv.id = pr.variant_id
          WHERE pr.variant_id IS NULL OR pv.variant_name = 'M'
          GROUP BY pr.product_id
      ) costs ON costs.product_id = p.id
      SET p.base_cost = COALESCE(costs.computed_cost, 0);

      UPDATE products p
      LEFT JOIN (
          SELECT od.product_id, SUM(od.quantity) AS sold_quantity
          FROM order_details od
          JOIN orders o ON o.id = od.order_id
          WHERE o.status = 'Completed'
          GROUP BY od.product_id
      ) sold ON sold.product_id = p.id
      SET p.sales_count = COALESCE(sold.sold_quantity, 0);
    END
  `);
}

async function ensureCompletedSalesTrigger() {
  await query('DROP TRIGGER IF EXISTS trg_orders_after_completed_sales');
  await query(`
    CREATE TRIGGER trg_orders_after_completed_sales
    AFTER UPDATE ON orders
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
        UPDATE products p
        JOIN (
            SELECT product_id, SUM(quantity) AS sold_quantity
            FROM order_details
            WHERE order_id = NEW.id
            GROUP BY product_id
        ) sold ON sold.product_id = p.id
        SET p.sales_count = p.sales_count + sold.sold_quantity;
      ELSEIF OLD.status = 'Completed' AND NEW.status <> 'Completed' THEN
        UPDATE products p
        JOIN (
            SELECT product_id, SUM(quantity) AS sold_quantity
            FROM order_details
            WHERE order_id = NEW.id
            GROUP BY product_id
        ) sold ON sold.product_id = p.id
        SET p.sales_count = GREATEST(p.sales_count - sold.sold_quantity, 0);
      END IF;
    END
  `);
}

async function ensureOrderDeliveryPickupSource() {
  await query('DROP TRIGGER IF EXISTS trg_orders_after_insert_delivery');
  await query(`
    CREATE TRIGGER trg_orders_after_insert_delivery
    AFTER INSERT ON orders
    FOR EACH ROW
    BEGIN
      IF NEW.delivery_address IS NOT NULL
          AND NEW.delivery_address <> ''
          AND NOT EXISTS (SELECT 1 FROM order_deliveries WHERE order_id = NEW.id)
      THEN
        INSERT INTO order_deliveries(order_id, driver_id, pickup_address, delivery_address, status, estimated_arrival)
        VALUES(
          NEW.id,
          (SELECT id FROM drivers WHERE is_active = TRUE ORDER BY id ASC LIMIT 1),
          COALESCE(
            (SELECT s.name FROM stores s WHERE s.is_active = TRUE ORDER BY s.display_order ASC, s.id ASC LIMIT 1),
            'BANTRASUA'
          ),
          NEW.delivery_address,
          'Assigned',
          DATE_ADD(NOW(), INTERVAL 30 MINUTE)
        );
      END IF;
    END
  `);

  await query('DROP TRIGGER IF EXISTS trg_stores_after_update_pickup');
  await query(`
    CREATE TRIGGER trg_stores_after_update_pickup
    AFTER UPDATE ON stores
    FOR EACH ROW
    BEGIN
      IF NEW.name <> OLD.name THEN
        UPDATE order_deliveries
        SET pickup_address = NEW.name
        WHERE pickup_address = OLD.name;
      END IF;
    END
  `);

  const pickupMappings = [
    ['%Nguy\u1ec5n Tr\u00e3i%', 1],
    ['%Nguyen Trai%', 1],
    ['%Th\u1ea3o \u0110i\u1ec1n%', 2],
    ['%Thao Dien%', 2],
    ['%C\u1ea7u Gi\u1ea5y%', 3],
    ['%Cau Giay%', 3]
  ];

  for (const [pattern, displayOrder] of pickupMappings) {
    await query(
      `UPDATE order_deliveries od
       JOIN (
         SELECT name
         FROM stores
         WHERE is_active = TRUE AND display_order = ?
         ORDER BY id ASC
         LIMIT 1
       ) picked
       SET od.pickup_address = picked.name
       WHERE od.pickup_address LIKE ?`,
      [displayOrder, pattern]
    );
  }

  await query(
    `UPDATE order_deliveries od
     JOIN (
       SELECT name
       FROM stores
       WHERE is_active = TRUE
       ORDER BY display_order ASC, id ASC
       LIMIT 1
     ) picked
     SET od.pickup_address = picked.name
     WHERE od.pickup_address = 'SOL & LUNA'`
  );
}

async function ensureRevenueStatisticsRoutine() {
  await query('DROP PROCEDURE IF EXISTS refresh_revenue_statistics');
  await query(`
    CREATE PROCEDURE refresh_revenue_statistics()
    BEGIN
      TRUNCATE TABLE revenue_daily_stats;
      TRUNCATE TABLE revenue_monthly_stats;
      TRUNCATE TABLE revenue_quarterly_stats;
      TRUNCATE TABLE revenue_yearly_stats;
      TRUNCATE TABLE invoice_daily_stats;
      TRUNCATE TABLE invoice_monthly_stats;
      TRUNCATE TABLE invoice_quarterly_stats;
      TRUNCATE TABLE invoice_yearly_stats;

      INSERT INTO revenue_daily_stats(
          stat_date, gross_revenue, discount_amount, net_revenue, paid_amount,
          completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
      )
      SELECT
          DATE(o.created_at) AS stat_date,
          SUM(CASE WHEN o.status <> 'Cancelled' THEN o.subtotal ELSE 0 END),
          SUM(CASE WHEN o.status <> 'Cancelled' THEN o.discount_amount ELSE 0 END),
          SUM(CASE WHEN o.status = 'Completed' THEN o.total_amount ELSE 0 END),
          SUM(CASE WHEN pay.status = 'Paid' THEN pay.amount ELSE 0 END),
          SUM(o.status = 'Completed'),
          SUM(o.status = 'Cancelled'),
          COUNT(*),
          COALESCE(SUM(CASE WHEN o.status = 'Completed' THEN items.items_sold ELSE 0 END), 0),
          CASE WHEN SUM(o.status = 'Completed') > 0
              THEN SUM(CASE WHEN o.status = 'Completed' THEN o.total_amount ELSE 0 END) / SUM(o.status = 'Completed')
              ELSE 0
          END
      FROM orders o
      LEFT JOIN payments pay ON pay.order_id = o.id
      LEFT JOIN (
          SELECT order_id, SUM(quantity) AS items_sold
          FROM order_details
          GROUP BY order_id
      ) items ON items.order_id = o.id
      GROUP BY DATE(o.created_at);

      INSERT INTO revenue_monthly_stats(
          stat_year, stat_month, gross_revenue, discount_amount, net_revenue, paid_amount,
          completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
      )
      SELECT
          YEAR(stat_date), MONTH(stat_date),
          SUM(gross_revenue), SUM(discount_amount), SUM(net_revenue), SUM(paid_amount),
          SUM(completed_orders), SUM(cancelled_orders), SUM(total_orders), SUM(items_sold),
          CASE WHEN SUM(completed_orders) > 0 THEN SUM(net_revenue) / SUM(completed_orders) ELSE 0 END
      FROM revenue_daily_stats
      GROUP BY YEAR(stat_date), MONTH(stat_date);

      INSERT INTO revenue_quarterly_stats(
          stat_year, stat_quarter, gross_revenue, discount_amount, net_revenue, paid_amount,
          completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
      )
      SELECT
          YEAR(stat_date), QUARTER(stat_date),
          SUM(gross_revenue), SUM(discount_amount), SUM(net_revenue), SUM(paid_amount),
          SUM(completed_orders), SUM(cancelled_orders), SUM(total_orders), SUM(items_sold),
          CASE WHEN SUM(completed_orders) > 0 THEN SUM(net_revenue) / SUM(completed_orders) ELSE 0 END
      FROM revenue_daily_stats
      GROUP BY YEAR(stat_date), QUARTER(stat_date);

      INSERT INTO revenue_yearly_stats(
          stat_year, gross_revenue, discount_amount, net_revenue, paid_amount,
          completed_orders, cancelled_orders, total_orders, items_sold, average_order_value
      )
      SELECT
          YEAR(stat_date),
          SUM(gross_revenue), SUM(discount_amount), SUM(net_revenue), SUM(paid_amount),
          SUM(completed_orders), SUM(cancelled_orders), SUM(total_orders), SUM(items_sold),
          CASE WHEN SUM(completed_orders) > 0 THEN SUM(net_revenue) / SUM(completed_orders) ELSE 0 END
      FROM revenue_daily_stats
      GROUP BY YEAR(stat_date);

      INSERT INTO invoice_daily_stats(
          stat_date, invoice_count, pending_count, paid_count, preparing_count,
          completed_count, cancelled_count, refunded_count, cash_count, online_count
      )
      SELECT
          DATE(o.created_at),
          COUNT(*),
          SUM(o.status = 'Pending'),
          SUM(o.status = 'Paid'),
          SUM(o.status = 'Preparing'),
          SUM(o.status = 'Completed'),
          SUM(o.status = 'Cancelled'),
          SUM(o.status = 'Refunded'),
          SUM(pay.method = 'Cash'),
          SUM(pay.method IN ('Card', 'Momo', 'VNPay'))
      FROM orders o
      LEFT JOIN payments pay ON pay.order_id = o.id
      GROUP BY DATE(o.created_at);

      INSERT INTO invoice_monthly_stats(
          stat_year, stat_month, invoice_count, pending_count, paid_count, preparing_count,
          completed_count, cancelled_count, refunded_count, cash_count, online_count
      )
      SELECT
          YEAR(stat_date), MONTH(stat_date),
          SUM(invoice_count), SUM(pending_count), SUM(paid_count), SUM(preparing_count),
          SUM(completed_count), SUM(cancelled_count), SUM(refunded_count), SUM(cash_count), SUM(online_count)
      FROM invoice_daily_stats
      GROUP BY YEAR(stat_date), MONTH(stat_date);

      INSERT INTO invoice_quarterly_stats(
          stat_year, stat_quarter, invoice_count, pending_count, paid_count, preparing_count,
          completed_count, cancelled_count, refunded_count, cash_count, online_count
      )
      SELECT
          YEAR(stat_date), QUARTER(stat_date),
          SUM(invoice_count), SUM(pending_count), SUM(paid_count), SUM(preparing_count),
          SUM(completed_count), SUM(cancelled_count), SUM(refunded_count), SUM(cash_count), SUM(online_count)
      FROM invoice_daily_stats
      GROUP BY YEAR(stat_date), QUARTER(stat_date);

      INSERT INTO invoice_yearly_stats(
          stat_year, invoice_count, pending_count, paid_count, preparing_count,
          completed_count, cancelled_count, refunded_count, cash_count, online_count
      )
      SELECT
          YEAR(stat_date),
          SUM(invoice_count), SUM(pending_count), SUM(paid_count), SUM(preparing_count),
          SUM(completed_count), SUM(cancelled_count), SUM(refunded_count), SUM(cash_count), SUM(online_count)
      FROM invoice_daily_stats
      GROUP BY YEAR(stat_date);
    END
  `);
}

async function ensureAdminAutoFieldTriggers() {
  const triggers = [
    [
      'trg_materials_before_insert_code',
      `
        CREATE TRIGGER trg_materials_before_insert_code
        BEFORE INSERT ON materials
        FOR EACH ROW
        BEGIN
          IF NEW.material_code IS NULL OR NEW.material_code = '' THEN
            SET NEW.material_code = CONCAT(
              'MAT-',
              CASE NEW.material_type
                WHEN 'Tea_Base' THEN 'TEA'
                WHEN 'Milk_Base' THEN 'MILK'
                WHEN 'Sweetener' THEN 'SWEET'
                WHEN 'Topping' THEN 'TOP'
                WHEN 'Fruit' THEN 'FRU'
                WHEN 'Powder' THEN 'POW'
                WHEN 'Cream' THEN 'CREAM'
                WHEN 'Packaging' THEN 'PKG'
                ELSE 'OTH'
              END,
              '-',
              DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
              '-',
              LPAD(FLOOR(RAND() * 10000), 4, '0')
            );
          END IF;
        END
      `
    ],
    [
      'trg_material_imports_before_insert_code',
      `
        CREATE TRIGGER trg_material_imports_before_insert_code
        BEFORE INSERT ON material_imports
        FOR EACH ROW
        BEGIN
          IF NEW.import_code IS NULL OR NEW.import_code = '' THEN
            SET NEW.import_code = CONCAT('PN', DATE_FORMAT(COALESCE(NEW.import_date, NOW()), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 1000000), 6, '0'));
          END IF;
          IF NEW.expected_date IS NULL THEN
            SET NEW.expected_date = DATE_ADD(DATE(COALESCE(NEW.import_date, NOW())), INTERVAL (2 + FLOOR(RAND() * 4)) DAY);
          END IF;
          IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
            SET NEW.invoice_number = CONCAT('INV-', DATE_FORMAT(COALESCE(NEW.import_date, NOW()), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
          END IF;
        END
      `
    ],
    [
      'trg_import_details_before_insert_totals',
      `
        CREATE TRIGGER trg_import_details_before_insert_totals
        BEFORE INSERT ON import_details
        FOR EACH ROW
        BEGIN
          IF NEW.subtotal IS NULL OR NEW.subtotal = 0 THEN
            SET NEW.subtotal = NEW.quantity * NEW.unit_price;
          END IF;
        END
      `
    ],
    [
      'trg_import_details_before_update_totals',
      `
        CREATE TRIGGER trg_import_details_before_update_totals
        BEFORE UPDATE ON import_details
        FOR EACH ROW
        BEGIN
          IF NEW.quantity <> OLD.quantity OR NEW.unit_price <> OLD.unit_price THEN
            SET NEW.subtotal = NEW.quantity * NEW.unit_price;
          END IF;
        END
      `
    ],
    [
      'trg_promotions_before_insert_code',
      `
        CREATE TRIGGER trg_promotions_before_insert_code
        BEFORE INSERT ON promotions
        FOR EACH ROW
        BEGIN
          IF NEW.code IS NULL OR NEW.code = '' THEN
            SET NEW.code = CONCAT('KM-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
          END IF;
          SET NEW.used_count = COALESCE(NEW.used_count, 0);
        END
      `
    ],
    [
      'trg_member_gift_codes_before_insert_code',
      `
        CREATE TRIGGER trg_member_gift_codes_before_insert_code
        BEFORE INSERT ON member_gift_codes
        FOR EACH ROW
        BEGIN
          IF NEW.code IS NULL OR NEW.code = '' THEN
            SET NEW.code = CONCAT('GIFT-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
          END IF;
          SET NEW.used_count = COALESCE(NEW.used_count, 0);
        END
      `
    ],
    [
      'trg_news_posts_before_insert_slug',
      `
        CREATE TRIGGER trg_news_posts_before_insert_slug
        BEFORE INSERT ON news_posts
        FOR EACH ROW
        BEGIN
          IF NEW.slug IS NULL OR NEW.slug = '' THEN
            SET NEW.slug = CONCAT('bai-viet-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
          END IF;
        END
      `
    ],
    [
      'trg_payments_before_insert_code',
      `
        CREATE TRIGGER trg_payments_before_insert_code
        BEFORE INSERT ON payments
        FOR EACH ROW
        BEGIN
          IF NEW.status = 'Paid' AND (NEW.transaction_code IS NULL OR NEW.transaction_code = '') THEN
            SET NEW.transaction_code = CONCAT('PAY-', NEW.order_id, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
          END IF;
          IF NEW.status = 'Paid' AND NEW.paid_at IS NULL THEN
            SET NEW.paid_at = NOW();
          END IF;
        END
      `
    ],
    [
      'trg_orders_before_insert_totals',
      `
        CREATE TRIGGER trg_orders_before_insert_totals
        BEFORE INSERT ON orders
        FOR EACH ROW
        BEGIN
          SET NEW.total_amount = GREATEST(COALESCE(NEW.subtotal, 0) - COALESCE(NEW.discount_amount, 0), 0);
        END
      `
    ],
    [
      'trg_orders_before_update_totals',
      `
        CREATE TRIGGER trg_orders_before_update_totals
        BEFORE UPDATE ON orders
        FOR EACH ROW
        BEGIN
          IF NEW.subtotal <> OLD.subtotal OR NEW.discount_amount <> OLD.discount_amount THEN
            SET NEW.total_amount = GREATEST(COALESCE(NEW.subtotal, 0) - COALESCE(NEW.discount_amount, 0), 0);
          END IF;
        END
      `
    ]
  ];

  for (const [name, sql] of triggers) {
    await query(`DROP TRIGGER IF EXISTS ${name}`);
    await query(sql);
  }

  await query('DROP TRIGGER IF EXISTS trg_payments_before_update_paid_at');
  await query(`
    CREATE TRIGGER trg_payments_before_update_paid_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'Paid' AND (NEW.transaction_code IS NULL OR NEW.transaction_code = '') THEN
        SET NEW.transaction_code = CONCAT('PAY-', NEW.order_id, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
      END IF;
      IF NEW.status = 'Paid' AND OLD.status <> 'Paid' AND NEW.paid_at IS NULL THEN
        SET NEW.paid_at = NOW();
      END IF;
    END
  `);
}

async function runMigrations() {
  await ensureCartOptionColumns();
  await ensureProductDiscountTable();
  await ensureProductRollupRoutine();
  await ensureRevenueStatisticsRoutine();
  await ensureCompletedSalesTrigger();
  await ensureOrderDeliveryPickupSource();
  await ensureAdminAutoFieldTriggers();
  await query('CALL refresh_product_rollups()');
  await query('CALL refresh_revenue_statistics()');
  if (await columnExists('products', 'is_best_seller')) {
    await query('UPDATE products SET is_best_seller = FALSE WHERE is_best_seller <> FALSE');
  }
}

module.exports = {
  runMigrations
};
