DROP DATABASE IF EXISTS qltrasua;
CREATE DATABASE qltrasua CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qltrasua;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+07:00';
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS promotion_usage;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_deliveries;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS invoice_yearly_stats;
DROP TABLE IF EXISTS invoice_quarterly_stats;
DROP TABLE IF EXISTS invoice_monthly_stats;
DROP TABLE IF EXISTS invoice_daily_stats;
DROP TABLE IF EXISTS revenue_yearly_stats;
DROP TABLE IF EXISTS revenue_quarterly_stats;
DROP TABLE IF EXISTS revenue_monthly_stats;
DROP TABLE IF EXISTS revenue_daily_stats;
DROP TABLE IF EXISTS member_gift_codes;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS material_batches;
DROP TABLE IF EXISTS import_details;
DROP TABLE IF EXISTS material_imports;
DROP TABLE IF EXISTS product_recipes;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS product_discounts;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS news_posts;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS customer_profiles;
DROP TABLE IF EXISTS membership_tiers;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customer_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    address TEXT,
    loyalty_points INT DEFAULT 0,
    membership_rank ENUM('Silver', 'Gold', 'VIP') DEFAULT 'Silver',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_profile_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_loyalty_points CHECK(loyalty_points >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE membership_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rank_name ENUM('Silver', 'Gold', 'VIP') NOT NULL UNIQUE,
    min_points INT NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    point_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1,
    birthday_reward_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    free_shipping_min_order DECIMAL(10,2) NULL,
    benefits TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_membership_min_points CHECK(min_points >= 0),
    CONSTRAINT chk_membership_discount CHECK(discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT chk_membership_multiplier CHECK(point_multiplier >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    address TEXT,
    tax_code VARCHAR(50) UNIQUE,
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    payment_terms VARCHAR(100),
    lead_time_days INT DEFAULT 1,
    note TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_supplier_lead_time CHECK(lead_time_days >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    base_cost DECIMAL(10,2) DEFAULT 0,
    barcode VARCHAR(100) UNIQUE,
    sku VARCHAR(100) UNIQUE,
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    recipe_required BOOLEAN DEFAULT TRUE,
    recipe_status ENUM('Draft', 'Ready', 'Missing') DEFAULT 'Missing',
    preparation_minutes INT DEFAULT 3,
    view_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT chk_product_price CHECK(price >= 0),
    CONSTRAINT chk_product_base_cost CHECK(base_cost >= 0),
    CONSTRAINT chk_stock_quantity CHECK(stock_quantity >= 0),
    CONSTRAINT chk_preparation_minutes CHECK(preparation_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_image FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    recipe_multiplier DECIMAL(6,3) DEFAULT 1,
    cup_volume_ml INT NULL,
    display_order INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_name),
    CONSTRAINT fk_variant_product FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT chk_variant_recipe_multiplier CHECK(recipe_multiplier > 0),
    CONSTRAINT chk_variant_volume CHECK(cup_volume_ml IS NULL OR cup_volume_ml > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_discounts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    material_code VARCHAR(100) UNIQUE,
    material_type ENUM('Tea_Base', 'Milk_Base', 'Sweetener', 'Topping', 'Fruit', 'Powder', 'Cream', 'Packaging', 'Other') DEFAULT 'Other',
    unit VARCHAR(50) NOT NULL,
    recipe_unit VARCHAR(50) NULL,
    conversion_rate DECIMAL(12,4) DEFAULT 1,
    stock_quantity DECIMAL(12,4) DEFAULT 0,
    min_stock_level DECIMAL(12,4) DEFAULT 5,
    reorder_point DECIMAL(12,4) DEFAULT 10,
    last_import_price DECIMAL(10,2) DEFAULT 0,
    average_cost DECIMAL(10,2) DEFAULT 0,
    stock_value DECIMAL(14,2) DEFAULT 0,
    shelf_life_days INT NULL,
    storage_note TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_material_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    CONSTRAINT chk_material_stock CHECK(stock_quantity >= 0),
    CONSTRAINT chk_material_conversion CHECK(conversion_rate > 0),
    CONSTRAINT chk_material_reorder CHECK(reorder_point >= 0),
    CONSTRAINT chk_material_shelf_life CHECK(shelf_life_days IS NULL OR shelf_life_days >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    variant_id INT NULL,
    material_id INT NOT NULL,
    step_name VARCHAR(100) NOT NULL DEFAULT 'Pha chế',
    step_order INT DEFAULT 1,
    quantity DECIMAL(12,4) NOT NULL,
    loss_percent DECIMAL(5,2) DEFAULT 0,
    is_optional BOOLEAN DEFAULT FALSE,
    note TEXT,
    UNIQUE(product_id, variant_id, material_id, step_name),
    CONSTRAINT fk_recipe_product FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_variant FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_material FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
    CONSTRAINT chk_recipe_quantity CHECK(quantity > 0),
    CONSTRAINT chk_recipe_loss CHECK(loss_percent >= 0 AND loss_percent <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE material_imports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_code VARCHAR(50) NULL UNIQUE,
    supplier_id INT NULL,
    admin_id INT NOT NULL,
    status ENUM('Draft', 'Received', 'Cancelled') DEFAULT 'Received',
    total_amount DECIMAL(14,2) NOT NULL,
    paid_amount DECIMAL(14,2) DEFAULT 0,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_date DATE NULL,
    invoice_number VARCHAR(100),
    note TEXT,
    CONSTRAINT fk_import_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    CONSTRAINT fk_import_admin FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_total_import CHECK(total_amount >= 0),
    CONSTRAINT chk_paid_import CHECK(paid_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE import_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_id INT NOT NULL,
    material_id INT NOT NULL,
    batch_code VARCHAR(100),
    quantity DECIMAL(12,4) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    manufacturing_date DATE NULL,
    expiry_date DATE NULL,
    note TEXT,
    CONSTRAINT fk_import_detail_import FOREIGN KEY(import_id) REFERENCES material_imports(id) ON DELETE CASCADE,
    CONSTRAINT fk_import_detail_material FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    CONSTRAINT chk_import_quantity CHECK(quantity > 0),
    CONSTRAINT chk_import_price CHECK(unit_price >= 0),
    CONSTRAINT chk_import_subtotal CHECK(subtotal >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE material_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_detail_id INT NULL,
    material_id INT NOT NULL,
    supplier_id INT NULL,
    batch_code VARCHAR(100) NOT NULL,
    initial_quantity DECIMAL(12,4) NOT NULL,
    remaining_quantity DECIMAL(12,4) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    manufacturing_date DATE NULL,
    expiry_date DATE NULL,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_closed BOOLEAN DEFAULT FALSE,
    UNIQUE(material_id, batch_code),
    CONSTRAINT fk_batch_import_detail FOREIGN KEY(import_detail_id) REFERENCES import_details(id) ON DELETE SET NULL,
    CONSTRAINT fk_batch_material FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    CONSTRAINT chk_batch_initial CHECK(initial_quantity > 0),
    CONSTRAINT chk_batch_remaining CHECK(remaining_quantity >= 0),
    CONSTRAINT chk_batch_price CHECK(unit_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    ice_level VARCHAR(50) NULL DEFAULT 'Bình thường',
    sugar_level VARCHAR(50) NULL DEFAULT 'Bình thường',
    topping_ids TEXT NULL,
    option_hash VARCHAR(64) NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cartitem_options(cart_id, product_id, variant_id, option_hash),
    CONSTRAINT fk_cartitem_cart FOREIGN KEY(cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cartitem_product FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_cartitem_variant FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT chk_cart_quantity CHECK(quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT,
    discount_type ENUM('Percent', 'Fixed_Amount') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    required_membership_rank ENUM('Silver', 'Gold', 'VIP') NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_discount_value CHECK(discount_value > 0),
    CONSTRAINT chk_minimum_order CHECK(minimum_order_amount >= 0),
    CONSTRAINT chk_promotion_date CHECK(end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE member_gift_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    membership_tier_id INT NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    gift_type ENUM('Voucher', 'Topping', 'Drink', 'Shipping') DEFAULT 'Voucher',
    gift_value DECIMAL(10,2) DEFAULT 0,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_gift_tier FOREIGN KEY(membership_tier_id) REFERENCES membership_tiers(id) ON DELETE CASCADE,
    CONSTRAINT chk_member_gift_date CHECK(end_date > start_date),
    CONSTRAINT chk_member_gift_value CHECK(gift_value >= 0),
    CONSTRAINT chk_member_gift_min_order CHECK(minimum_order_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) DEFAULT 'Xe máy',
    license_plate VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    promotion_id INT NULL,
    receiver_name VARCHAR(100) NULL,
    receiver_phone VARCHAR(20) NULL,
    delivery_address TEXT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Paid', 'Preparing', 'Completed', 'Cancelled', 'Refunded') DEFAULT 'Pending',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_promotion FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    CONSTRAINT chk_order_subtotal CHECK(subtotal >= 0),
    CONSTRAINT chk_order_discount CHECK(discount_amount >= 0),
    CONSTRAINT chk_order_total CHECK(total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    ice_level VARCHAR(50),
    sugar_level VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orderdetail_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_orderdetail_product FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orderdetail_variant FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT chk_order_quantity CHECK(quantity > 0),
    CONSTRAINT chk_order_price CHECK(unit_price >= 0),
    CONSTRAINT chk_order_subtotal2 CHECK(subtotal >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    driver_id INT NULL,
    pickup_address TEXT,
    delivery_address TEXT NOT NULL,
    status ENUM('Assigned', 'Picked_Up', 'Delivering', 'Delivered', 'Failed') DEFAULT 'Assigned',
    estimated_arrival DATETIME NULL,
    delivered_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_delivery_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_delivery_driver FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('Cash', 'Card', 'Momo', 'VNPay') NOT NULL,
    status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    transaction_code VARCHAR(100) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME NULL,
    CONSTRAINT fk_payment_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount CHECK(amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    batch_id INT NULL,
    transaction_type ENUM('Import', 'Order_Usage', 'Adjustment_In', 'Adjustment_Out', 'Waste', 'Return') NOT NULL,
    reference_type ENUM('material_imports', 'orders', 'manual') NOT NULL,
    reference_id INT NULL,
    quantity_change DECIMAL(12,4) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    stock_after DECIMAL(12,4) NOT NULL,
    note TEXT,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_material FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_batch FOREIGN KEY(batch_id) REFERENCES material_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_inventory_user FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE revenue_daily_stats (
    stat_date DATE PRIMARY KEY,
    gross_revenue DECIMAL(14,2) DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    net_revenue DECIMAL(14,2) DEFAULT 0,
    paid_amount DECIMAL(14,2) DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    items_sold INT DEFAULT 0,
    average_order_value DECIMAL(14,2) DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE revenue_monthly_stats (
    stat_year INT NOT NULL,
    stat_month INT NOT NULL,
    gross_revenue DECIMAL(14,2) DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    net_revenue DECIMAL(14,2) DEFAULT 0,
    paid_amount DECIMAL(14,2) DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    items_sold INT DEFAULT 0,
    average_order_value DECIMAL(14,2) DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(stat_year, stat_month),
    CONSTRAINT chk_revenue_month CHECK(stat_month BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE revenue_quarterly_stats (
    stat_year INT NOT NULL,
    stat_quarter INT NOT NULL,
    gross_revenue DECIMAL(14,2) DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    net_revenue DECIMAL(14,2) DEFAULT 0,
    paid_amount DECIMAL(14,2) DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    items_sold INT DEFAULT 0,
    average_order_value DECIMAL(14,2) DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(stat_year, stat_quarter),
    CONSTRAINT chk_revenue_quarter CHECK(stat_quarter BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE revenue_yearly_stats (
    stat_year INT PRIMARY KEY,
    gross_revenue DECIMAL(14,2) DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    net_revenue DECIMAL(14,2) DEFAULT 0,
    paid_amount DECIMAL(14,2) DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    items_sold INT DEFAULT 0,
    average_order_value DECIMAL(14,2) DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_daily_stats (
    stat_date DATE PRIMARY KEY,
    invoice_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    paid_count INT DEFAULT 0,
    preparing_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    cancelled_count INT DEFAULT 0,
    refunded_count INT DEFAULT 0,
    cash_count INT DEFAULT 0,
    online_count INT DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_monthly_stats (
    stat_year INT NOT NULL,
    stat_month INT NOT NULL,
    invoice_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    paid_count INT DEFAULT 0,
    preparing_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    cancelled_count INT DEFAULT 0,
    refunded_count INT DEFAULT 0,
    cash_count INT DEFAULT 0,
    online_count INT DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(stat_year, stat_month),
    CONSTRAINT chk_invoice_month CHECK(stat_month BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_quarterly_stats (
    stat_year INT NOT NULL,
    stat_quarter INT NOT NULL,
    invoice_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    paid_count INT DEFAULT 0,
    preparing_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    cancelled_count INT DEFAULT 0,
    refunded_count INT DEFAULT 0,
    cash_count INT DEFAULT 0,
    online_count INT DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(stat_year, stat_quarter),
    CONSTRAINT chk_invoice_quarter CHECK(stat_quarter BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_yearly_stats (
    stat_year INT PRIMARY KEY,
    invoice_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    paid_count INT DEFAULT 0,
    preparing_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    cancelled_count INT DEFAULT 0,
    refunded_count INT DEFAULT 0,
    cash_count INT DEFAULT 0,
    online_count INT DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promotion_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    promotion_id INT NOT NULL,
    order_id INT NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, promotion_id, order_id),
    CONSTRAINT fk_promotion_usage_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_promotion_usage_promotion FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    CONSTRAINT fk_promotion_usage_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loyalty_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_id INT NULL,
    transaction_type ENUM('earn', 'redeem', 'refund') NOT NULL,
    points INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loyalty_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_loyalty_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT chk_points CHECK(points <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    target_link VARCHAR(255),
    placement ENUM('home', 'cart', 'all') DEFAULT 'home',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL DEFAULT 'TP.HCM',
    phone VARCHAR(20),
    opening_hours VARCHAR(100),
    map_url VARCHAR(500),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE news_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    image_url VARCHAR(500),
    post_type ENUM('News', 'Promotion', 'Guide') DEFAULT 'News',
    is_published BOOLEAN DEFAULT TRUE,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    title VARCHAR(255),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    CONSTRAINT fk_chat_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    sender ENUM('user', 'assistant', 'system') NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_message_session FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_customer_user ON customer_profiles(user_id);
CREATE INDEX idx_product_category ON products(category_id);
CREATE INDEX idx_product_best_seller ON products(is_best_seller, sales_count);
CREATE INDEX idx_product_recipe_status ON products(recipe_required, recipe_status, is_active);
CREATE INDEX idx_variant_product ON product_variants(product_id);
CREATE INDEX idx_product_image ON product_images(product_id, is_primary);
CREATE INDEX idx_product_discount_category ON product_discounts(category_id, is_active, start_date, end_date);
CREATE INDEX idx_product_discount_product ON product_discounts(product_id, is_active, start_date, end_date);
CREATE INDEX idx_product_discount_scope ON product_discounts(scope, is_active, priority);
CREATE INDEX idx_material_supplier ON materials(supplier_id);
CREATE INDEX idx_material_active_type ON materials(is_active, material_type);
CREATE INDEX idx_recipe_product ON product_recipes(product_id);
CREATE INDEX idx_recipe_material ON product_recipes(material_id);
CREATE INDEX idx_recipe_variant ON product_recipes(variant_id);
CREATE INDEX idx_import_supplier ON material_imports(supplier_id);
CREATE INDEX idx_import_admin ON material_imports(admin_id);
CREATE INDEX idx_import_detail_import ON import_details(import_id);
CREATE INDEX idx_import_detail_material ON import_details(material_id);
CREATE INDEX idx_material_batch_material ON material_batches(material_id, expiry_date, remaining_quantity);
CREATE INDEX idx_material_batch_supplier ON material_batches(supplier_id);
CREATE INDEX idx_inventory_material_created ON inventory_transactions(material_id, created_at);
CREATE INDEX idx_inventory_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_cartitem_cart ON cart_items(cart_id);
CREATE INDEX idx_cartitem_product ON cart_items(product_id);
CREATE INDEX idx_cartitem_variant ON cart_items(variant_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_promotion ON orders(promotion_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orderdetail_order ON order_details(order_id);
CREATE INDEX idx_orderdetail_product ON order_details(product_id);
CREATE INDEX idx_orderdetail_variant ON order_details(variant_id);
CREATE INDEX idx_delivery_status ON order_deliveries(status);
CREATE INDEX idx_delivery_driver ON order_deliveries(driver_id);
CREATE INDEX idx_payment_order ON payments(order_id);
CREATE INDEX idx_promotion_code ON promotions(code);
CREATE INDEX idx_promotion_membership ON promotions(required_membership_rank, is_active, end_date);
CREATE INDEX idx_member_gift_tier ON member_gift_codes(membership_tier_id, is_active, end_date);
CREATE INDEX idx_membership_tier_active ON membership_tiers(is_active, min_points);
CREATE INDEX idx_loyalty_user ON loyalty_transactions(user_id);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_banner_order ON banners(display_order);
CREATE INDEX idx_banner_active ON banners(is_active);
CREATE INDEX idx_banner_placement ON banners(placement, is_active, display_order);
CREATE INDEX idx_store_active ON stores(is_active, display_order);
CREATE INDEX idx_news_published ON news_posts(is_published, published_at);
CREATE INDEX idx_news_slug ON news_posts(slug);
CREATE INDEX idx_chat_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_session ON chat_messages(session_id);
CREATE INDEX idx_chat_created ON chat_messages(created_at);

DELIMITER $$

CREATE TRIGGER trg_material_imports_before_insert_code
BEFORE INSERT ON material_imports
FOR EACH ROW
BEGIN
    IF NEW.import_code IS NULL OR NEW.import_code = '' THEN
        SET NEW.import_code = CONCAT('PN', DATE_FORMAT(COALESCE(NEW.import_date, NOW()), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 1000000), 6, '0'));
    END IF;
END$$

CREATE TRIGGER trg_payments_before_update_paid_at
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'Paid' AND OLD.status <> 'Paid' AND NEW.paid_at IS NULL THEN
        SET NEW.paid_at = NOW();
    END IF;
END$$

CREATE TRIGGER trg_orders_after_status_update_log
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO activity_logs(user_id, action, entity_type, entity_id)
        VALUES(NEW.user_id, CONCAT('Order status changed from ', OLD.status, ' to ', NEW.status), 'orders', NEW.id);
    END IF;
END$$

CREATE TRIGGER trg_orders_after_status_update_delivery
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
        UPDATE order_deliveries
        SET status = 'Delivered', delivered_at = COALESCE(delivered_at, NOW())
        WHERE order_id = NEW.id;
    ELSEIF NEW.status IN ('Cancelled', 'Refunded') AND OLD.status <> NEW.status THEN
        UPDATE order_deliveries
        SET status = 'Failed'
        WHERE order_id = NEW.id AND status <> 'Delivered';
    END IF;
END$$

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
            'SOL & LUNA',
            NEW.delivery_address,
            'Assigned',
            DATE_ADD(NOW(), INTERVAL 30 MINUTE)
        );
    END IF;
END$$

CREATE PROCEDURE refresh_customer_membership(IN p_user_id INT)
BEGIN
    DECLARE next_rank ENUM('Silver', 'Gold', 'VIP') DEFAULT 'Silver';

    SELECT rank_name INTO next_rank
    FROM membership_tiers
    WHERE is_active = TRUE
        AND min_points <= COALESCE((SELECT loyalty_points FROM customer_profiles WHERE user_id = p_user_id), 0)
    ORDER BY min_points DESC
    LIMIT 1;

    UPDATE customer_profiles
    SET membership_rank = COALESCE(next_rank, 'Silver')
    WHERE user_id = p_user_id;
END$$

CREATE TRIGGER trg_orders_after_completed_loyalty
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    DECLARE tier_multiplier DECIMAL(5,2) DEFAULT 1;
    DECLARE earned_points INT DEFAULT 0;

    IF NEW.status = 'Completed' AND OLD.status <> 'Completed' AND NEW.user_id IS NOT NULL THEN
        SELECT COALESCE(mt.point_multiplier, 1) INTO tier_multiplier
        FROM customer_profiles cp
        LEFT JOIN membership_tiers mt ON mt.rank_name = cp.membership_rank AND mt.is_active = TRUE
        WHERE cp.user_id = NEW.user_id
        LIMIT 1;

        SET earned_points = FLOOR((NEW.total_amount / 1000) * tier_multiplier);

        IF earned_points > 0 THEN
            INSERT INTO loyalty_transactions(user_id, order_id, transaction_type, points, reason)
            VALUES(NEW.user_id, NEW.id, 'earn', earned_points, CONCAT('Tich diem don hang #', NEW.id));

            UPDATE customer_profiles
            SET loyalty_points = loyalty_points + earned_points
            WHERE user_id = NEW.user_id;

            CALL refresh_customer_membership(NEW.user_id);
        END IF;
    END IF;
END$$

CREATE PROCEDURE consume_material_batches(
    IN p_material_id INT,
    IN p_quantity DECIMAL(12,4)
)
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_batch_id INT DEFAULT 0;
    DECLARE v_remaining DECIMAL(12,4) DEFAULT 0;
    DECLARE v_take DECIMAL(12,4) DEFAULT 0;
    DECLARE v_need DECIMAL(12,4) DEFAULT 0;
    DECLARE batch_cursor CURSOR FOR
        SELECT id, remaining_quantity
        FROM material_batches
        WHERE material_id = p_material_id
            AND remaining_quantity > 0
        ORDER BY COALESCE(expiry_date, '9999-12-31') ASC, received_at ASC, id ASC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    SET v_need = p_quantity;

    OPEN batch_cursor;
    batch_loop: LOOP
        FETCH batch_cursor INTO v_batch_id, v_remaining;

        IF done = 1 THEN
            LEAVE batch_loop;
        END IF;

        IF v_need <= 0 THEN
            LEAVE batch_loop;
        END IF;

        SET v_take = LEAST(v_remaining, v_need);

        UPDATE material_batches
        SET remaining_quantity = remaining_quantity - v_take,
            is_closed = CASE WHEN remaining_quantity - v_take <= 0 THEN TRUE ELSE is_closed END
        WHERE id = v_batch_id;

        SET v_need = v_need - v_take;
    END LOOP;
    CLOSE batch_cursor;

    IF v_need > 0.0001 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong du ton theo lo nguyen lieu';
    END IF;
END$$

CREATE PROCEDURE complete_order(IN p_order_id INT)
BEGIN
    DECLARE insufficient_stock INT DEFAULT 0;
    DECLARE missing_recipe INT DEFAULT 0;
    DECLARE usage_done INT DEFAULT 0;
    DECLARE v_usage_material_id INT DEFAULT 0;
    DECLARE v_usage_quantity DECIMAL(12,4) DEFAULT 0;
    DECLARE usage_cursor CURSOR FOR
        SELECT
            pr.material_id,
            SUM(
                od.quantity
                * pr.quantity
                * CASE
                    WHEN pr.variant_id IS NULL
                        AND NOT EXISTS (
                            SELECT 1
                            FROM materials m2
                            WHERE m2.id = pr.material_id
                                AND m2.material_type = 'Packaging'
                        )
                        THEN COALESCE(pv.recipe_multiplier, 1)
                    ELSE 1
                END
                * (1 + pr.loss_percent / 100)
            ) AS total_used
        FROM order_details od
        JOIN product_recipes pr ON od.product_id = pr.product_id
            AND (pr.variant_id = od.variant_id OR pr.variant_id IS NULL)
        LEFT JOIN product_variants pv ON pv.id = od.variant_id
        WHERE od.order_id = p_order_id
        GROUP BY pr.material_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET usage_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id FROM orders WHERE id = p_order_id FOR UPDATE;

    SELECT COUNT(*) INTO missing_recipe
    FROM order_details od
    JOIN products p ON p.id = od.product_id
    LEFT JOIN product_recipes pr ON pr.product_id = od.product_id
        AND (pr.variant_id = od.variant_id OR pr.variant_id IS NULL)
    WHERE od.order_id = p_order_id
        AND p.recipe_required = TRUE
        AND pr.id IS NULL;

    IF missing_recipe > 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'San pham chua co cong thuc nguyen lieu';
    END IF;

    SELECT COUNT(*) INTO insufficient_stock
    FROM materials m
    JOIN (
        SELECT
            pr.material_id,
            SUM(
                od.quantity
                * pr.quantity
                * CASE
                    WHEN pr.variant_id IS NULL
                        AND NOT EXISTS (
                            SELECT 1
                            FROM materials m2
                            WHERE m2.id = pr.material_id
                                AND m2.material_type = 'Packaging'
                        )
                        THEN COALESCE(pv.recipe_multiplier, 1)
                    ELSE 1
                END
                * (1 + pr.loss_percent / 100)
            ) AS total_used
        FROM order_details od
        JOIN product_recipes pr ON od.product_id = pr.product_id
            AND (pr.variant_id = od.variant_id OR pr.variant_id IS NULL)
        LEFT JOIN product_variants pv ON pv.id = od.variant_id
        WHERE od.order_id = p_order_id
        GROUP BY pr.material_id
    ) usage_data ON m.id = usage_data.material_id
    WHERE m.stock_quantity < usage_data.total_used;

    IF insufficient_stock > 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong du nguyen lieu trong kho';
    ELSE
        INSERT INTO inventory_transactions(
            material_id,
            transaction_type,
            reference_type,
            reference_id,
            quantity_change,
            unit_cost,
            stock_after,
            note
        )
        SELECT
            m.id,
            'Order_Usage',
            'orders',
            p_order_id,
            -usage_data.total_used,
            m.average_cost,
            m.stock_quantity - usage_data.total_used,
            CONCAT('Tru kho theo cong thuc don hang #', p_order_id)
        FROM materials m
        JOIN (
            SELECT
                pr.material_id,
                SUM(
                    od.quantity
                    * pr.quantity
                    * CASE
                        WHEN pr.variant_id IS NULL
                            AND NOT EXISTS (
                                SELECT 1
                                FROM materials m2
                                WHERE m2.id = pr.material_id
                                    AND m2.material_type = 'Packaging'
                            )
                            THEN COALESCE(pv.recipe_multiplier, 1)
                        ELSE 1
                    END
                    * (1 + pr.loss_percent / 100)
                ) AS total_used
            FROM order_details od
            JOIN product_recipes pr ON od.product_id = pr.product_id
                AND (pr.variant_id = od.variant_id OR pr.variant_id IS NULL)
            LEFT JOIN product_variants pv ON pv.id = od.variant_id
            WHERE od.order_id = p_order_id
            GROUP BY pr.material_id
        ) usage_data ON m.id = usage_data.material_id;

        OPEN usage_cursor;
        usage_loop: LOOP
            FETCH usage_cursor INTO v_usage_material_id, v_usage_quantity;

            IF usage_done = 1 THEN
                LEAVE usage_loop;
            END IF;

            CALL consume_material_batches(v_usage_material_id, v_usage_quantity);
        END LOOP;
        CLOSE usage_cursor;

        UPDATE materials m
        JOIN (
            SELECT
                pr.material_id,
                SUM(
                    od.quantity
                    * pr.quantity
                    * CASE
                        WHEN pr.variant_id IS NULL
                            AND NOT EXISTS (
                                SELECT 1
                                FROM materials m2
                                WHERE m2.id = pr.material_id
                                    AND m2.material_type = 'Packaging'
                            )
                            THEN COALESCE(pv.recipe_multiplier, 1)
                        ELSE 1
                    END
                    * (1 + pr.loss_percent / 100)
                ) AS total_used
            FROM order_details od
            JOIN product_recipes pr ON od.product_id = pr.product_id
                AND (pr.variant_id = od.variant_id OR pr.variant_id IS NULL)
            LEFT JOIN product_variants pv ON pv.id = od.variant_id
            WHERE od.order_id = p_order_id
            GROUP BY pr.material_id
        ) usage_data ON m.id = usage_data.material_id
        SET m.stock_quantity = m.stock_quantity - usage_data.total_used,
            m.stock_value = GREATEST(m.stock_value - (usage_data.total_used * m.average_cost), 0);

        UPDATE orders SET status = 'Completed' WHERE id = p_order_id;
        COMMIT;
    END IF;
END$$

CREATE PROCEDURE add_material_stock(IN p_material_id INT, IN p_quantity DECIMAL(12,4))
BEGIN
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So luong nhap phai lon hon 0';
    END IF;

    UPDATE materials
    SET stock_quantity = stock_quantity + p_quantity,
        stock_value = stock_value + (p_quantity * average_cost)
    WHERE id = p_material_id;
END$$

CREATE PROCEDURE add_material_stock_with_cost(
    IN p_material_id INT,
    IN p_quantity DECIMAL(12,4),
    IN p_unit_price DECIMAL(10,2)
)
BEGIN
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So luong nhap phai lon hon 0';
    END IF;

    IF p_unit_price < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gia nhap khong duoc am';
    END IF;

    UPDATE materials
    SET average_cost = CASE
            WHEN stock_quantity + p_quantity > 0
                THEN (stock_value + (p_quantity * p_unit_price)) / (stock_quantity + p_quantity)
            ELSE p_unit_price
        END,
        stock_value = stock_value + (p_quantity * p_unit_price),
        last_import_price = p_unit_price,
        stock_quantity = stock_quantity + p_quantity
    WHERE id = p_material_id;
END$$

CREATE PROCEDURE receive_material_import_detail(
    IN p_import_detail_id INT,
    IN p_created_by INT
)
BEGIN
    DECLARE v_material_id INT DEFAULT 0;
    DECLARE v_supplier_id INT DEFAULT NULL;
    DECLARE v_batch_id INT DEFAULT NULL;
    DECLARE v_batch_code VARCHAR(100);
    DECLARE v_quantity DECIMAL(12,4) DEFAULT 0;
    DECLARE v_unit_price DECIMAL(10,2) DEFAULT 0;
    DECLARE v_manufacturing_date DATE DEFAULT NULL;
    DECLARE v_expiry_date DATE DEFAULT NULL;
    DECLARE v_stock_after DECIMAL(12,4) DEFAULT 0;

    SELECT idt.material_id, mi.supplier_id, idt.batch_code, idt.quantity, idt.unit_price,
           idt.manufacturing_date, idt.expiry_date
    INTO v_material_id, v_supplier_id, v_batch_code, v_quantity, v_unit_price,
         v_manufacturing_date, v_expiry_date
    FROM import_details idt
    JOIN material_imports mi ON mi.id = idt.import_id
    WHERE idt.id = p_import_detail_id
    LIMIT 1;

    IF v_material_id IS NULL OR v_material_id = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chi tiet nhap khong hop le';
    END IF;

    IF v_batch_code IS NULL OR v_batch_code = '' THEN
        SET v_batch_code = CONCAT('LOT-', v_material_id, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', p_import_detail_id);
    END IF;

    UPDATE materials
    SET average_cost = CASE
            WHEN stock_quantity + v_quantity > 0
                THEN (stock_value + (v_quantity * v_unit_price)) / (stock_quantity + v_quantity)
            ELSE v_unit_price
        END,
        stock_value = stock_value + (v_quantity * v_unit_price),
        last_import_price = v_unit_price,
        stock_quantity = stock_quantity + v_quantity
    WHERE id = v_material_id;

    SELECT stock_quantity INTO v_stock_after
    FROM materials
    WHERE id = v_material_id;

    INSERT INTO material_batches(
        import_detail_id,
        material_id,
        supplier_id,
        batch_code,
        initial_quantity,
        remaining_quantity,
        unit_price,
        manufacturing_date,
        expiry_date,
        received_at
    )
    VALUES(
        p_import_detail_id,
        v_material_id,
        v_supplier_id,
        v_batch_code,
        v_quantity,
        v_quantity,
        v_unit_price,
        v_manufacturing_date,
        v_expiry_date,
        NOW()
    );

    SET v_batch_id = LAST_INSERT_ID();

    INSERT INTO inventory_transactions(
        material_id,
        batch_id,
        transaction_type,
        reference_type,
        reference_id,
        quantity_change,
        unit_cost,
        stock_after,
        note,
        created_by
    )
    VALUES(
        v_material_id,
        v_batch_id,
        'Import',
        'material_imports',
        (SELECT import_id FROM import_details WHERE id = p_import_detail_id),
        v_quantity,
        v_unit_price,
        v_stock_after,
        CONCAT('Nhap kho lo ', v_batch_code),
        p_created_by
    );
END$$

CREATE PROCEDURE assign_driver_to_order(IN p_order_id INT, IN p_driver_id INT)
BEGIN
    UPDATE order_deliveries
    SET driver_id = p_driver_id,
        status = 'Assigned',
        estimated_arrival = COALESCE(estimated_arrival, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
    WHERE order_id = p_order_id;
END$$

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
        COALESCE(SUM(items.items_sold), 0),
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
END$$

DELIMITER ;

INSERT INTO roles(id, name) VALUES
(1, 'Admin'),
(2, 'Client');

INSERT INTO users(id, role_id, username, password_hash, is_active) VALUES
(1, 1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', TRUE),
(2, 2, 'client', '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE),
(3, 2, 'hoangnam', '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE),
(4, 2, 'thuhang', '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE),
(5, 2, 'phuonglinh', '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE),
(6, 2, 'quanghuy', '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE),
(7, 2, 'baotran', '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE);

INSERT INTO customer_profiles(user_id, full_name, email, phone, address, loyalty_points, membership_rank) VALUES
(2, 'Nguyễn Minh Anh', 'minhanh@sol-luna.local', '0909000000', '12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM', 85, 'Silver'),
(3, 'Trần Hoàng Nam', 'hoangnam@sol-luna.local', '0912345678', '28 Võ Văn Tần, Phường Võ Thị Sáu, Quận 3, TP.HCM', 620, 'Gold'),
(4, 'Lê Thu Hằng', 'thuhang@sol-luna.local', '0938123456', '74 Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức, TP.HCM', 1780, 'VIP'),
(5, 'Phạm Phương Linh', 'phuonglinh@sol-luna.local', '0976123456', '15 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', 340, 'Silver'),
(6, 'Đỗ Quang Huy', 'quanghuy@sol-luna.local', '0987456123', '89 Cầu Giấy, Phường Quan Hoa, Cầu Giấy, Hà Nội', 910, 'Gold'),
(7, 'Vũ Bảo Trân', 'baotran@sol-luna.local', '0968123456', '22 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM', 45, 'Silver');

INSERT INTO membership_tiers
    (id, rank_name, min_points, discount_percent, point_multiplier, birthday_reward_amount, free_shipping_min_order, benefits, is_active)
VALUES
(1, 'Silver', 0, 0, 1.00, 0, NULL, 'Tích điểm cho mỗi đơn hàng và nhận thông báo ưu đãi mới.', TRUE),
(2, 'Gold', 500, 5, 1.20, 20000, 120000, 'Giảm 5% cho đơn hàng, tích điểm nhanh hơn và nhận voucher sinh nhật 20.000đ.', TRUE),
(3, 'VIP', 1500, 10, 1.50, 50000, 80000, 'Giảm 10% cho đơn hàng, tích điểm 1.5 lần, freeship từ 80.000đ và voucher sinh nhật 50.000đ.', TRUE);

INSERT INTO categories(id, name, description) VALUES
(1, 'Trà sữa', 'Các món trà sữa béo thơm, phù hợp uống hằng ngày'),
(2, 'Trà trái cây', 'Đồ uống thanh mát từ trà và trái cây tươi'),
(3, 'Sữa tươi', 'Sữa tươi kết hợp trân châu, đường đen và kem béo'),
(4, 'Đá xay', 'Đồ uống đá xay mát lạnh'),
(5, 'Topping', 'Các loại topping thêm cho đồ uống');

INSERT INTO suppliers
    (id, name, contact_name, phone, email, address, tax_code, bank_name, bank_account, payment_terms, lead_time_days, note, is_active)
VALUES
(1, 'Công ty Nguyên Liệu Việt', 'Anh Minh', '0901000001', 'minh@nlviet.vn', '12 Kho nguyên liệu, Quận 7, TP.HCM', '0310000001', 'Vietcombank', '102010001', 'Thanh toán trong 7 ngày', 2, 'Chuyên trà, trân châu và đường đen.', TRUE),
(2, 'Milk Tea Supply', 'Chị Lan', '0901000002', 'lan@milktea.vn', '88 Nguyễn Trãi, Thanh Xuân, Hà Nội', '0100000002', 'Techcombank', '190010002', 'Cấn trừ công nợ hằng tháng', 3, 'Cung cấp bột sữa, matcha, kem cheese, pudding.', TRUE),
(3, 'Trái Cây Fresh', 'Anh Khoa', '0901000003', 'khoa@fresh.vn', '25 Kho lạnh, Phường 8, Đà Lạt', '5800000003', 'ACB', '761000003', 'Thanh toán ngay khi nhận hàng', 1, 'Cung cấp trái cây đóng hộp và syrup.', TRUE);

INSERT INTO products
    (id, category_id, name, description, short_description, price, base_cost, barcode, sku, stock_quantity, min_stock_level, recipe_required, recipe_status, preparation_minutes, view_count, sales_count, is_best_seller, is_active)
VALUES
(1, 1, 'Trà sữa truyền thống', 'Vị trà đậm, sữa béo nhẹ, hợp khẩu vị mọi lứa tuổi.', 'Trà sữa nền cơ bản dễ uống.', 30000, 10500, 'TS001', 'DRK-TS-001', 80, 10, TRUE, 'Ready', 4, 342, 120, FALSE, TRUE),
(2, 1, 'Trà sữa trân châu đường đen', 'Sữa tươi thơm béo kết hợp trân châu đường đen dẻo ngọt.', 'Trân châu dẻo cùng đường đen.', 39000, 15500, 'TS002', 'DRK-TS-002', 65, 10, TRUE, 'Ready', 5, 422, 150, FALSE, TRUE),
(3, 1, 'Trà sữa matcha', 'Matcha thơm nhẹ, hậu vị thanh, thêm sữa béo vừa phải.', 'Matcha thơm béo vừa vị.', 36000, 14500, 'TS003', 'DRK-TS-003', 48, 10, TRUE, 'Ready', 5, 212, 88, FALSE, TRUE),
(4, 2, 'Trà đào cam sả', 'Trà đào thanh mát cùng cam tươi và hương sả dịu.', 'Trà trái cây thanh mát.', 35000, 13500, 'TC001', 'DRK-TC-001', 70, 10, TRUE, 'Ready', 4, 261, 95, FALSE, TRUE),
(5, 2, 'Trà vải hoa hồng', 'Vải ngọt thơm, nền trà nhẹ và hương hoa hồng tinh tế.', 'Vải ngọt, trà nhẹ.', 37000, 14200, 'TC002', 'DRK-TC-002', 52, 10, TRUE, 'Ready', 4, 180, 74, FALSE, TRUE),
(6, 3, 'Sữa tươi trân châu đường đen', 'Sữa tươi mát lạnh, trân châu nấu mới mỗi ngày.', 'Sữa tươi cùng trân châu.', 42000, 16800, 'ST001', 'DRK-ST-001', 58, 10, TRUE, 'Ready', 5, 380, 132, FALSE, TRUE),
(7, 4, 'Matcha đá xay kem cheese', 'Matcha đá xay mịn, phủ kem cheese béo mặn.', 'Đá xay matcha phủ cheese.', 45000, 17800, 'DX001', 'DRK-DX-001', 36, 10, TRUE, 'Ready', 6, 140, 58, FALSE, TRUE),
(8, 4, 'Chocolate đá xay', 'Chocolate đậm vị, đá xay mịn, dùng kèm kem béo.', 'Chocolate đá xay đậm vị.', 44000, 17100, 'DX002', 'DRK-DX-002', 40, 10, TRUE, 'Ready', 6, 155, 63, FALSE, TRUE),
(9, 1, 'Trà ô long sữa', 'Ô long thơm đậm, sữa béo nhẹ, hậu vị thanh.', 'Ô long sữa hậu vị thanh.', 34000, 12200, 'TS004', 'DRK-TS-004', 80, 10, TRUE, 'Ready', 4, 0, 0, FALSE, TRUE),
(10, 1, 'Trà sữa khoai môn', 'Khoai môn bùi béo cùng nền trà sữa mềm vị.', 'Khoai môn bùi béo.', 38000, 14800, 'TS005', 'DRK-TS-005', 80, 10, TRUE, 'Ready', 5, 0, 0, FALSE, TRUE),
(11, 1, 'Trà sữa socola', 'Socola thơm đậm, phù hợp uống lạnh.', 'Socola thơm đậm.', 37000, 14300, 'TS006', 'DRK-TS-006', 80, 10, TRUE, 'Ready', 5, 0, 0, FALSE, TRUE),
(12, 2, 'Trà chanh mật ong', 'Trà tươi, chanh vàng và mật ong dịu ngọt.', 'Chanh mật ong dịu ngọt.', 32000, 11800, 'TC003', 'DRK-TC-003', 80, 10, TRUE, 'Ready', 4, 0, 0, FALSE, TRUE),
(13, 2, 'Trà dâu tằm', 'Vị dâu tằm chua ngọt, uống mát.', 'Dâu tằm chua ngọt.', 36000, 13600, 'TC004', 'DRK-TC-004', 80, 10, TRUE, 'Ready', 4, 0, 0, FALSE, TRUE),
(14, 3, 'Sữa tươi matcha', 'Sữa tươi kết hợp matcha thơm nhẹ.', 'Sữa tươi matcha mềm vị.', 41000, 16000, 'ST002', 'DRK-ST-002', 80, 10, TRUE, 'Ready', 5, 0, 0, FALSE, TRUE),
(15, 4, 'Cookie đá xay', 'Đá xay cookie giòn thơm, phủ kem béo.', 'Cookie đá xay phủ kem.', 46000, 18200, 'DX003', 'DRK-DX-003', 80, 10, TRUE, 'Ready', 6, 0, 0, FALSE, TRUE),
(16, 5, 'Trân châu đen', 'Topping trân châu dẻo nấu mới.', 'Topping trân châu.', 8000, 3600, 'TP001', 'TOP-001', 80, 10, TRUE, 'Ready', 1, 0, 0, FALSE, TRUE),
(17, 5, 'Kem cheese', 'Kem cheese béo mặn dùng kèm đồ uống.', 'Topping kem cheese.', 10000, 4800, 'TP002', 'TOP-002', 80, 10, TRUE, 'Ready', 1, 0, 0, FALSE, TRUE),
(18, 5, 'Pudding trứng', 'Pudding mềm thơm, thêm vào trà sữa.', 'Topping pudding trứng.', 9000, 4200, 'TP003', 'TOP-003', 80, 10, TRUE, 'Ready', 1, 0, 0, FALSE, TRUE),
(19, 1, 'Hồng trà sữa', 'Hồng trà thơm dịu kết hợp sữa béo nhẹ, vị thanh và dễ uống.', 'Hồng trà sữa thanh vị.', 34000, 12500, 'TS007', 'DRK-TS-007', 90, 10, TRUE, 'Ready', 4, 1, 130, FALSE, TRUE);

INSERT INTO product_images(id, product_id, image_url, is_primary, display_order) VALUES
(1, 1, 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(2, 2, 'https://images.unsplash.com/photo-1621221814639-d7404696c2c5?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(3, 3, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(4, 4, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(5, 5, 'https://images.unsplash.com/photo-1556679343-c1c1b5331ddc?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(6, 6, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(7, 7, 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(8, 8, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(9, 9, 'https://images.unsplash.com/photo-1556679343-c1c1b5331ddc?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(10, 10, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(11, 11, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(12, 12, 'https://images.unsplash.com/photo-1556679343-c1c1b5331ddc?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(13, 13, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(14, 14, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(15, 15, 'https://images.unsplash.com/photo-1556679343-c1c1b5331ddc?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(16, 16, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(17, 17, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(18, 18, 'https://images.unsplash.com/photo-1556679343-c1c1b5331ddc?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(19, 19, 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=80', TRUE, 1);

INSERT INTO product_variants(product_id, variant_name, price_adjustment, recipe_multiplier, cup_volume_ml, display_order)
SELECT id, 'M', 0, 1.000, 500, 1 FROM products WHERE category_id <> 5
UNION ALL
SELECT id, 'L', 7000, 1.250, 700, 2 FROM products WHERE category_id <> 5
UNION ALL
SELECT id, 'XL', 12000, 1.500, 900, 3 FROM products WHERE category_id <> 5;

INSERT INTO product_discounts
(id, title, scope, category_id, product_id, discount_type, discount_value, start_date, end_date, priority, is_active)
VALUES
(1, 'Ưu đãi trà sữa xanh', 'Category', 1, NULL, 'Percent', 10, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 1, TRUE),
(2, 'Kem cheese giá mềm', 'Product', NULL, 17, 'Fixed_Amount', 2000, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 5, TRUE);

INSERT INTO materials
(id, supplier_id, name, material_code, material_type, unit, recipe_unit, conversion_rate, stock_quantity, min_stock_level, reorder_point, last_import_price, average_cost, stock_value, shelf_life_days, storage_note, is_active)
VALUES
(1, 1, 'Trà đen', 'MAT-TEA-001', 'Tea_Base', 'kg', 'kg', 1, 0, 60, 90, 0, 0, 0, 365, 'Bảo quản nơi khô ráo, tránh nắng.', TRUE),
(2, 2, 'Bột sữa', 'MAT-MILK-001', 'Milk_Base', 'kg', 'kg', 1, 0, 80, 120, 0, 0, 0, 270, 'Đóng kín sau khi mở bao.', TRUE),
(3, 1, 'Trân châu', 'MAT-TOP-001', 'Topping', 'kg', 'kg', 1, 0, 70, 100, 0, 0, 0, 180, 'Nấu mới mỗi ngày, hàng khô để nơi thoáng.', TRUE),
(4, 1, 'Đường đen', 'MAT-SWEET-001', 'Sweetener', 'kg', 'kg', 1, 0, 45, 70, 0, 0, 0, 360, 'Đậy kín sau khi dùng.', TRUE),
(5, 2, 'Matcha', 'MAT-POW-001', 'Powder', 'kg', 'kg', 1, 0, 25, 40, 0, 0, 0, 240, 'Bảo quản kín, tránh ẩm.', TRUE),
(6, 3, 'Đào miếng', 'MAT-FRU-001', 'Fruit', 'hộp', 'hộp', 1, 0, 60, 90, 0, 0, 0, 540, 'Hàng lon, kiểm tra hạn dùng khi nhập.', TRUE),
(7, 3, 'Vải ngâm', 'MAT-FRU-002', 'Fruit', 'hộp', 'hộp', 1, 0, 60, 90, 0, 0, 0, 540, 'Hàng lon, dùng trước hạn.', TRUE),
(8, 2, 'Kem cheese', 'MAT-CREAM-001', 'Cream', 'kg', 'kg', 1, 0, 35, 55, 0, 0, 0, 90, 'Bảo quản lạnh sau khi mở.', TRUE),
(9, 3, 'Dâu tằm ngâm', 'MAT-FRU-003', 'Fruit', 'hộp', 'hộp', 1, 0, 45, 70, 0, 0, 0, 360, 'Hàng syrup trái cây.', TRUE),
(10, 2, 'Pudding trứng', 'MAT-TOP-002', 'Topping', 'kg', 'kg', 1, 0, 35, 55, 0, 0, 0, 120, 'Bảo quản mát.', TRUE),
(11, 2, 'Sữa tươi', 'MAT-MILK-002', 'Milk_Base', 'lít', 'lít', 1, 0, 80, 120, 0, 0, 0, 14, 'Bảo quản lạnh 2-6 độ C.', TRUE),
(12, 2, 'Bột cacao', 'MAT-POW-002', 'Powder', 'kg', 'kg', 1, 0, 25, 40, 0, 0, 0, 270, 'Đóng kín sau khi dùng.', TRUE),
(13, 2, 'Bột khoai môn', 'MAT-POW-003', 'Powder', 'kg', 'kg', 1, 0, 25, 40, 0, 0, 0, 270, 'Để nơi khô ráo.', TRUE),
(14, 3, 'Chanh vàng', 'MAT-FRU-004', 'Fruit', 'kg', 'kg', 1, 0, 20, 35, 0, 0, 0, 10, 'Bảo quản mát, ưu tiên dùng sớm.', TRUE),
(15, 3, 'Mật ong', 'MAT-SWEET-002', 'Sweetener', 'lít', 'lít', 1, 0, 20, 35, 0, 0, 0, 720, 'Đậy kín, tránh nước.', TRUE),
(16, 2, 'Cookie vụn', 'MAT-TOP-003', 'Topping', 'kg', 'kg', 1, 0, 25, 40, 0, 0, 0, 180, 'Đóng kín tránh ẩm.', TRUE),
(17, 1, 'Ly nhựa M 500ml', 'PKG-CUP-M', 'Packaging', 'cái', 'cái', 1, 0, 300, 500, 0, 0, 0, NULL, 'Vật tư đóng gói size M.', TRUE),
(18, 1, 'Ly nhựa L 700ml', 'PKG-CUP-L', 'Packaging', 'cái', 'cái', 1, 0, 300, 500, 0, 0, 0, NULL, 'Vật tư đóng gói size L.', TRUE),
(19, 1, 'Ly nhựa XL 900ml', 'PKG-CUP-XL', 'Packaging', 'cái', 'cái', 1, 0, 200, 350, 0, 0, 0, NULL, 'Vật tư đóng gói size XL.', TRUE),
(20, 1, 'Nắp ly', 'PKG-LID-001', 'Packaging', 'cái', 'cái', 1, 0, 500, 800, 0, 0, 0, NULL, 'Nắp dùng chung.', TRUE),
(21, 1, 'Ống hút', 'PKG-STRAW-001', 'Packaging', 'cái', 'cái', 1, 0, 500, 800, 0, 0, 0, NULL, 'Ống hút dùng chung.', TRUE);

INSERT INTO product_recipes(product_id, variant_id, material_id, step_name, step_order, quantity, loss_percent, is_optional, note) VALUES
(1, NULL, 1, 'Pha cốt trà', 1, 0.030, 3, FALSE, 'Ủ trà đen làm nền'),
(1, NULL, 2, 'Pha sữa', 2, 0.040, 2, FALSE, 'Bột sữa cho vị béo'),
(1, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(1, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(2, NULL, 1, 'Pha cốt trà', 1, 0.030, 3, FALSE, 'Nền trà đen'),
(2, NULL, 2, 'Pha sữa', 2, 0.040, 2, FALSE, 'Bột sữa'),
(2, NULL, 3, 'Thêm topping nền', 3, 0.050, 2, FALSE, 'Trân châu mặc định'),
(2, NULL, 4, 'Nấu đường đen', 4, 0.030, 2, FALSE, 'Đường đen phủ ly'),
(2, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(2, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(3, NULL, 5, 'Pha matcha', 1, 0.025, 3, FALSE, 'Matcha nền'),
(3, NULL, 2, 'Pha sữa', 2, 0.040, 2, FALSE, 'Bột sữa'),
(3, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(3, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(4, NULL, 1, 'Pha cốt trà', 1, 0.025, 3, FALSE, 'Nền trà đen nhẹ'),
(4, NULL, 6, 'Thêm trái cây', 2, 0.080, 0, FALSE, 'Đào miếng'),
(4, NULL, 14, 'Tạo vị', 3, 0.015, 5, FALSE, 'Chanh vàng'),
(4, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(4, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(5, NULL, 1, 'Pha cốt trà', 1, 0.025, 3, FALSE, 'Nền trà nhẹ'),
(5, NULL, 7, 'Thêm trái cây', 2, 0.080, 0, FALSE, 'Vải ngâm'),
(5, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(5, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(6, NULL, 11, 'Pha sữa tươi', 1, 0.180, 2, FALSE, 'Sữa tươi nền'),
(6, NULL, 3, 'Thêm topping nền', 2, 0.050, 2, FALSE, 'Trân châu'),
(6, NULL, 4, 'Nấu đường đen', 3, 0.030, 2, FALSE, 'Đường đen'),
(6, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(6, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(7, NULL, 5, 'Xay nền', 1, 0.030, 4, FALSE, 'Matcha đá xay'),
(7, NULL, 8, 'Phủ kem', 2, 0.040, 3, FALSE, 'Kem cheese'),
(7, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(7, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(8, NULL, 12, 'Xay nền', 1, 0.045, 3, FALSE, 'Bột cacao'),
(8, NULL, 2, 'Pha sữa', 2, 0.030, 2, FALSE, 'Bột sữa'),
(8, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(8, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(9, NULL, 1, 'Pha cốt trà', 1, 0.028, 3, FALSE, 'Cốt ô long thay bằng trà đen trong demo'),
(9, NULL, 2, 'Pha sữa', 2, 0.035, 2, FALSE, 'Bột sữa'),
(9, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(9, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(10, NULL, 1, 'Pha cốt trà', 1, 0.025, 3, FALSE, 'Nền trà'),
(10, NULL, 13, 'Pha vị', 2, 0.045, 2, FALSE, 'Bột khoai môn'),
(10, NULL, 2, 'Pha sữa', 3, 0.035, 2, FALSE, 'Bột sữa'),
(10, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(10, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(11, NULL, 12, 'Pha vị', 1, 0.040, 2, FALSE, 'Bột cacao'),
(11, NULL, 2, 'Pha sữa', 2, 0.045, 2, FALSE, 'Bột sữa'),
(11, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(11, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(12, NULL, 1, 'Pha cốt trà', 1, 0.020, 3, FALSE, 'Nền trà'),
(12, NULL, 14, 'Tạo vị', 2, 0.020, 5, FALSE, 'Chanh vàng'),
(12, NULL, 15, 'Tạo ngọt', 3, 0.025, 2, FALSE, 'Mật ong'),
(12, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(12, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(13, NULL, 1, 'Pha cốt trà', 1, 0.020, 3, FALSE, 'Nền trà'),
(13, NULL, 9, 'Thêm trái cây', 2, 0.080, 0, FALSE, 'Dâu tằm ngâm'),
(13, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(13, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(14, NULL, 11, 'Pha sữa tươi', 1, 0.180, 2, FALSE, 'Sữa tươi'),
(14, NULL, 5, 'Pha matcha', 2, 0.022, 3, FALSE, 'Matcha'),
(14, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(14, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(15, NULL, 16, 'Xay nền', 1, 0.055, 3, FALSE, 'Cookie vụn'),
(15, NULL, 2, 'Pha sữa', 2, 0.040, 2, FALSE, 'Bột sữa'),
(15, NULL, 8, 'Phủ kem', 3, 0.030, 3, FALSE, 'Kem cheese'),
(15, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(15, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút'),
(16, NULL, 3, 'Định lượng topping', 1, 0.080, 2, FALSE, 'Một phần trân châu thêm'),
(17, NULL, 8, 'Định lượng topping', 1, 0.060, 3, FALSE, 'Một phần kem cheese thêm'),
(18, NULL, 10, 'Định lượng topping', 1, 0.070, 2, FALSE, 'Một phần pudding thêm'),
(19, NULL, 1, 'Pha cốt trà', 1, 0.030, 3, FALSE, 'Hồng trà demo dùng trà đen'),
(19, NULL, 2, 'Pha sữa', 2, 0.040, 2, FALSE, 'Bột sữa'),
(19, NULL, 20, 'Đóng ly', 90, 1.000, 0, FALSE, 'Nắp ly'),
(19, NULL, 21, 'Đóng ly', 91, 1.000, 0, FALSE, 'Ống hút');

INSERT INTO product_recipes(product_id, variant_id, material_id, step_name, step_order, quantity, loss_percent, is_optional, note)
SELECT p.id, pv.id, 17, 'Chọn ly theo size', 80, 1, 0, FALSE, 'Ly size M'
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.variant_name = 'M'
WHERE p.category_id <> 5
UNION ALL
SELECT p.id, pv.id, 18, 'Chọn ly theo size', 80, 1, 0, FALSE, 'Ly size L'
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.variant_name = 'L'
WHERE p.category_id <> 5
UNION ALL
SELECT p.id, pv.id, 19, 'Chọn ly theo size', 80, 1, 0, FALSE, 'Ly size XL'
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.variant_name = 'XL'
WHERE p.category_id <> 5;

INSERT INTO material_imports(id, import_code, supplier_id, admin_id, status, total_amount, paid_amount, import_date, expected_date, invoice_number, note) VALUES
(1, 'PN20260528-001', 1, 1, 'Received', 54190000, 54190000, '2026-05-28 09:15:00', '2026-05-28', 'INV-NLV-0528', 'Nhập nền trà, trân châu và đường đen cho kế hoạch bán 2 tuần.'),
(2, 'PN20260602-001', 2, 1, 'Received', 193555000, 120000000, '2026-06-02 08:40:00', '2026-06-02', 'INV-MTS-0602', 'Nhập bột sữa, sữa tươi, matcha và kem cheese cho nhóm món bán chạy.'),
(3, 'PN20260603-001', 3, 1, 'Received', 64640000, 64640000, '2026-06-03 10:20:00', '2026-06-03', 'INV-FRU-0603', 'Nhập trái cây, mật ong và chanh cho trà trái cây.'),
(4, 'PN20260604-001', 1, 1, 'Received', 64490000, 64490000, '2026-06-04 14:05:00', '2026-06-04', 'INV-NLV-0604', 'Chốt thêm trà đen, trân châu, đường đen và vật tư đóng gói cho cuối tuần.'),
(5, 'PN20260604-002', 2, 1, 'Received', 45620000, 20000000, '2026-06-04 16:30:00', '2026-06-04', 'INV-MTS-0604', 'Bổ sung pudding trứng, cacao, khoai môn và cookie cho món mới.');

INSERT INTO import_details(import_id, material_id, batch_code, quantity, unit_price, subtotal, manufacturing_date, expiry_date, note) VALUES
(1, 1, 'TEA-BLK-202605', 170, 175000, 29750000, '2026-05-10', '2027-05-10', 'Trà đen nền đợt 1'),
(1, 3, 'BOBA-202605', 260, 68000, 17680000, '2026-05-20', '2026-11-20', 'Trân châu khô'),
(1, 4, 'BSUGAR-202605', 130, 52000, 6760000, '2026-05-18', '2027-05-18', 'Đường đen'),
(2, 2, 'MILKPOW-202606', 520, 118000, 61360000, '2026-05-25', '2027-02-25', 'Bột sữa'),
(2, 5, 'MATCHA-202606', 145, 315000, 45675000, '2026-05-22', '2027-01-22', 'Matcha'),
(2, 8, 'CHEESE-202606', 210, 168000, 35280000, '2026-06-01', '2026-09-01', 'Kem cheese'),
(2, 11, 'FRESHMILK-202606', 420, 122000, 51240000, '2026-06-01', '2026-06-15', 'Sữa tươi thanh trùng'),
(3, 6, 'PEACH-202606', 340, 64000, 21760000, '2026-05-15', '2027-11-15', 'Đào miếng'),
(3, 7, 'LYCHEE-202606', 320, 68000, 21760000, '2026-05-18', '2027-11-18', 'Vải ngâm'),
(3, 9, 'MULBERRY-202606', 260, 72000, 18720000, '2026-05-21', '2027-05-21', 'Dâu tằm ngâm'),
(3, 14, 'LEMON-202606', 120, 20000, 2400000, '2026-06-02', '2026-06-12', 'Chanh vàng'),
(4, 1, 'TEA-BLK-202606', 210, 185000, 38850000, '2026-06-01', '2027-06-01', 'Trà đen bổ sung'),
(4, 3, 'BOBA-202606', 170, 72000, 12240000, '2026-06-01', '2026-12-01', 'Trân châu bổ sung'),
(4, 4, 'BSUGAR-202606', 150, 52000, 7800000, '2026-06-01', '2027-06-01', 'Đường đen bổ sung'),
(4, 17, 'CUP-M-202606', 900, 1200, 1080000, NULL, NULL, 'Ly M'),
(4, 18, 'CUP-L-202606', 700, 1500, 1050000, NULL, NULL, 'Ly L'),
(4, 19, 'CUP-XL-202606', 400, 1800, 720000, NULL, NULL, 'Ly XL'),
(4, 20, 'LID-202606', 2500, 650, 1625000, NULL, NULL, 'Nắp ly'),
(4, 21, 'STRAW-202606', 2500, 450, 1125000, NULL, NULL, 'Ống hút'),
(5, 10, 'PUDDING-202606', 190, 98000, 18620000, '2026-06-01', '2026-10-01', 'Pudding trứng'),
(5, 12, 'CACAO-202606', 95, 110000, 10450000, '2026-05-25', '2027-02-25', 'Bột cacao'),
(5, 13, 'TARO-202606', 80, 82000, 6560000, '2026-05-25', '2027-02-25', 'Bột khoai môn'),
(5, 15, 'HONEY-202606', 80, 72000, 5760000, '2026-05-20', '2028-05-20', 'Mật ong'),
(5, 16, 'COOKIE-202606', 60, 70500, 4230000, '2026-05-28', '2026-11-28', 'Cookie vụn');

CALL receive_material_import_detail(1, 1);
CALL receive_material_import_detail(2, 1);
CALL receive_material_import_detail(3, 1);
CALL receive_material_import_detail(4, 1);
CALL receive_material_import_detail(5, 1);
CALL receive_material_import_detail(6, 1);
CALL receive_material_import_detail(7, 1);
CALL receive_material_import_detail(8, 1);
CALL receive_material_import_detail(9, 1);
CALL receive_material_import_detail(10, 1);
CALL receive_material_import_detail(11, 1);
CALL receive_material_import_detail(12, 1);
CALL receive_material_import_detail(13, 1);
CALL receive_material_import_detail(14, 1);
CALL receive_material_import_detail(15, 1);
CALL receive_material_import_detail(16, 1);
CALL receive_material_import_detail(17, 1);
CALL receive_material_import_detail(18, 1);
CALL receive_material_import_detail(19, 1);
CALL receive_material_import_detail(20, 1);
CALL receive_material_import_detail(21, 1);
CALL receive_material_import_detail(22, 1);
CALL receive_material_import_detail(23, 1);
CALL receive_material_import_detail(24, 1);

INSERT INTO promotions
    (id, code, title, description, discount_type, discount_value, minimum_order_amount, required_membership_rank, usage_limit, used_count, start_date, end_date, is_active)
VALUES
(1, 'WELCOME20', 'Ưu đãi chào bạn mới', 'Giảm 20% cho đơn đầu tiên từ 50.000đ.', 'Percent', 20, 50000, NULL, 200, 0, '2026-01-01 00:00:00', '2027-01-01 00:00:00', TRUE),
(2, 'FREESHIP', 'Hỗ trợ phí giao hàng', 'Giảm 15.000đ cho đơn từ 80.000đ.', 'Fixed_Amount', 15000, 80000, NULL, 300, 0, '2026-01-01 00:00:00', '2027-01-01 00:00:00', TRUE),
(3, 'GOLD5', 'Ưu đãi hội viên Gold', 'Giảm 5% cho hội viên Gold và VIP.', 'Percent', 5, 70000, 'Gold', 500, 0, '2026-01-01 00:00:00', '2027-01-01 00:00:00', TRUE),
(4, 'VIP50K', 'Quà riêng hội viên VIP', 'Giảm 50.000đ cho đơn VIP từ 200.000đ.', 'Fixed_Amount', 50000, 200000, 'VIP', 100, 0, '2026-01-01 00:00:00', '2027-01-01 00:00:00', TRUE),
(5, 'VIP10', 'VIP uống ngon hơn', 'Giảm 10% cho hội viên VIP trong tuần.', 'Percent', 10, 100000, 'VIP', 200, 0, '2026-01-01 00:00:00', '2027-01-01 00:00:00', TRUE);

INSERT INTO member_gift_codes
    (id, membership_tier_id, code, title, description, gift_type, gift_value, minimum_order_amount, start_date, end_date, usage_limit, used_count, is_active)
VALUES
(1, 1, 'SILVER-TOPPING', 'Tặng topping cho Silver', 'Hội viên Silver nhận mã thêm topping trân châu khi đạt đơn từ 60.000đ.', 'Topping', 8000, 60000, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 300, 0, TRUE),
(2, 2, 'GOLD-BDAY20', 'Quà sinh nhật Gold', 'Voucher sinh nhật 20.000đ cho hội viên Gold.', 'Voucher', 20000, 80000, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 200, 0, TRUE),
(3, 2, 'GOLD-FREESHIP', 'Freeship Gold', 'Hỗ trợ giao hàng cho hội viên Gold với đơn từ 120.000đ.', 'Shipping', 15000, 120000, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 200, 0, TRUE),
(4, 3, 'VIP-BDAY50', 'Quà sinh nhật VIP', 'Voucher sinh nhật 50.000đ cho hội viên VIP.', 'Voucher', 50000, 100000, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 100, 0, TRUE),
(5, 3, 'VIP-DRINK', 'Tặng đồ uống VIP', 'Tặng một ly size M cho hội viên VIP trong chương trình đặc biệt.', 'Drink', 45000, 150000, '2026-01-01 00:00:00', '2027-01-01 00:00:00', 80, 0, TRUE);

INSERT INTO drivers(id, name, phone, vehicle_type, license_plate, is_active) VALUES
(1, 'Nguyễn Văn Phúc', '0900000001', 'Xe máy', '59-A1 12345', TRUE),
(2, 'Trần Đức Tài', '0900000002', 'Xe máy', '59-B2 67890', TRUE),
(3, 'Lê Minh Khoa', '0900000003', 'Xe máy', '59-C3 24680', TRUE),
(4, 'Phạm Hoàng Long', '0900000004', 'Xe máy', '29-D1 13579', TRUE);

INSERT INTO banners(id, title, image_url, target_link, placement, display_order, is_active, starts_at, ends_at) VALUES
(1, 'Best seller tuần này', 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1200&q=80', '/products', 'home', 1, TRUE, NULL, NULL),
(2, 'Ưu đãi trà trái cây', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80', '/products?category=2', 'home', 2, TRUE, NULL, NULL),
(3, 'Sữa tươi đường đen', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=1200&q=80', '/products', 'all', 3, TRUE, NULL, NULL),
(4, 'Thêm món bán chạy cho đơn hàng', 'https://images.unsplash.com/photo-1621221814639-d7404696c2c5?auto=format&fit=crop&w=1200&q=80', '/products', 'cart', 1, TRUE, NULL, NULL),
(5, 'Giảm 20% cho đơn từ 50.000đ', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80', '/cart', 'cart', 2, TRUE, NULL, NULL);

INSERT INTO stores(id, name, address, district, city, phone, opening_hours, map_url, image_url, is_active, display_order) VALUES
(1, 'SOL & LUNA Nguyễn Trãi', '12 Nguyễn Trãi, Phường Bến Thành', 'Quận 1', 'TP.HCM', '1900 1508', '08:00 - 22:00', 'https://maps.google.com/?q=Nguyen+Trai+Quan+1+TPHCM', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80', TRUE, 1),
(2, 'SOL & LUNA Thảo Điền', '45 Quốc Hương, Phường Thảo Điền', 'TP. Thủ Đức', 'TP.HCM', '1900 1508', '08:00 - 22:30', 'https://maps.google.com/?q=Thao+Dien+TPHCM', 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&q=80', TRUE, 2),
(3, 'SOL & LUNA Cầu Giấy', '89 Cầu Giấy, Phường Quan Hoa', 'Cầu Giấy', 'Hà Nội', '1900 1508', '08:30 - 22:00', 'https://maps.google.com/?q=Cau+Giay+Ha+Noi', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80', TRUE, 3);

INSERT INTO news_posts(id, title, slug, excerpt, content, image_url, post_type, is_published, published_at) VALUES
(1, 'Ra mắt mốc hội viên SOL & LUNA 2026', 'ra-mat-moc-hoi-vien-sol-luna-2026', 'Silver, Gold và VIP có mốc điểm, ưu đãi và mã quà riêng.', 'Chương trình hội viên SOL & LUNA giúp khách hàng tích điểm sau mỗi đơn hoàn tất. Điểm càng cao, hạng càng tốt và quyền lợi càng nhiều.', 'https://images.unsplash.com/photo-1556742526-795a8eac090e?auto=format&fit=crop&w=1200&q=80', 'News', TRUE, '2026-01-10 09:00:00'),
(2, 'Ưu đãi riêng cho hội viên Gold và VIP', 'uu-dai-rieng-cho-hoi-vien-gold-vip', 'Gold nhận giảm 5%, VIP nhận voucher và ưu đãi sinh nhật.', 'Các mã GOLD5, VIP50K và VIP10 được áp dụng theo hạng thành viên. Khách hàng đăng nhập để hệ thống kiểm tra hạng trước khi dùng mã.', 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=1200&q=80', 'Promotion', TRUE, '2026-01-15 09:00:00'),
(3, 'Cách chọn trà sữa theo khẩu vị', 'cach-chon-tra-sua-theo-khau-vi', 'Gợi ý nhanh cho người thích béo thơm, thanh mát hoặc ít ngọt.', 'Nếu thích béo thơm, hãy chọn sữa tươi trân châu đường đen hoặc trà sữa khoai môn. Nếu thích thanh mát, trà vải hoa hồng và trà chanh mật ong là lựa chọn dễ uống.', 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1200&q=80', 'Guide', TRUE, '2026-01-18 09:00:00');

INSERT INTO orders
    (id, user_id, promotion_id, receiver_name, receiver_phone, delivery_address, subtotal, discount_amount, total_amount, status, note, created_at, updated_at)
VALUES
(1, 3, 3, 'Trần Hoàng Nam', '0912345678', '28 Võ Văn Tần, Phường Võ Thị Sáu, Quận 3, TP.HCM', 128000, 6400, 121600, 'Completed', 'Ít đá, giao trước giờ nghỉ trưa giúp mình.', '2026-06-03 11:20:00', '2026-06-03 12:05:00'),
(2, 4, 5, 'Lê Thu Hằng', '0938123456', '74 Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức, TP.HCM', 146000, 14600, 131400, 'Preparing', 'Ly matcha để riêng kem cheese, không cần ống hút nhựa.', '2026-06-04 15:35:00', '2026-06-04 15:42:00'),
(3, 5, NULL, 'Phạm Phương Linh', '0976123456', '15 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', 67000, 0, 67000, 'Pending', 'Sẽ thanh toán tiền mặt khi nhận hàng.', '2026-06-05 09:10:00', '2026-06-05 09:10:00'),
(4, 2, NULL, 'Nguyễn Minh Anh', '0909000000', '12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM', 74000, 0, 74000, 'Paid', 'Giao trong giờ hành chính, gọi trước 5 phút.', '2026-06-05 10:25:00', '2026-06-05 10:28:00'),
(5, 6, 2, 'Đỗ Quang Huy', '0987456123', '89 Cầu Giấy, Phường Quan Hoa, Cầu Giấy, Hà Nội', 122000, 15000, 107000, 'Completed', 'Đơn cho nhóm văn phòng, chia túi riêng giúp mình.', '2026-06-02 16:05:00', '2026-06-02 17:00:00'),
(6, 7, NULL, 'Vũ Bảo Trân', '0968123456', '22 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM', 44000, 0, 44000, 'Cancelled', 'Khách báo đặt nhầm địa chỉ.', '2026-06-01 19:30:00', '2026-06-01 19:36:00');

INSERT INTO order_details(order_id, product_id, variant_id, quantity, unit_price, subtotal, ice_level, sugar_level, created_at) VALUES
(1, 2, (SELECT id FROM product_variants WHERE product_id = 2 AND variant_name = 'M'), 2, 39000, 78000, 'Ít đá', '70%', '2026-06-03 11:20:00'),
(1, 6, (SELECT id FROM product_variants WHERE product_id = 6 AND variant_name = 'M'), 1, 42000, 42000, 'Bình thường', '70%', '2026-06-03 11:20:00'),
(1, 16, NULL, 1, 8000, 8000, NULL, NULL, '2026-06-03 11:20:00'),
(2, 7, (SELECT id FROM product_variants WHERE product_id = 7 AND variant_name = 'M'), 2, 45000, 90000, 'Ít đá', '50%', '2026-06-04 15:35:00'),
(2, 5, (SELECT id FROM product_variants WHERE product_id = 5 AND variant_name = 'M'), 1, 37000, 37000, 'Bình thường', '50%', '2026-06-04 15:35:00'),
(2, 17, NULL, 1, 10000, 10000, NULL, NULL, '2026-06-04 15:35:00'),
(2, 18, NULL, 1, 9000, 9000, NULL, NULL, '2026-06-04 15:35:00'),
(3, 1, (SELECT id FROM product_variants WHERE product_id = 1 AND variant_name = 'M'), 1, 30000, 30000, 'Bình thường', '70%', '2026-06-05 09:10:00'),
(3, 5, (SELECT id FROM product_variants WHERE product_id = 5 AND variant_name = 'M'), 1, 37000, 37000, 'Ít đá', '50%', '2026-06-05 09:10:00'),
(4, 4, (SELECT id FROM product_variants WHERE product_id = 4 AND variant_name = 'M'), 1, 35000, 35000, 'Ít đá', '70%', '2026-06-05 10:25:00'),
(4, 2, (SELECT id FROM product_variants WHERE product_id = 2 AND variant_name = 'M'), 1, 39000, 39000, 'Bình thường', '70%', '2026-06-05 10:25:00'),
(5, 9, (SELECT id FROM product_variants WHERE product_id = 9 AND variant_name = 'M'), 2, 34000, 68000, 'Bình thường', '70%', '2026-06-02 16:05:00'),
(5, 3, (SELECT id FROM product_variants WHERE product_id = 3 AND variant_name = 'M'), 1, 36000, 36000, 'Ít đá', '50%', '2026-06-02 16:05:00'),
(5, 17, NULL, 1, 10000, 10000, NULL, NULL, '2026-06-02 16:05:00'),
(5, 16, NULL, 1, 8000, 8000, NULL, NULL, '2026-06-02 16:05:00'),
(6, 8, (SELECT id FROM product_variants WHERE product_id = 8 AND variant_name = 'M'), 1, 44000, 44000, 'Bình thường', '70%', '2026-06-01 19:30:00');

INSERT INTO payments(order_id, amount, method, status, transaction_code, created_at, paid_at) VALUES
(1, 121600, 'Momo', 'Paid', 'MOMO-SL-20260603-001', '2026-06-03 11:21:00', '2026-06-03 11:21:00'),
(2, 131400, 'VNPay', 'Paid', 'VNP-SL-20260604-002', '2026-06-04 15:36:00', '2026-06-04 15:36:00'),
(3, 67000, 'Cash', 'Pending', NULL, '2026-06-05 09:10:00', NULL),
(4, 74000, 'Card', 'Paid', 'CARD-SL-20260605-004', '2026-06-05 10:26:00', '2026-06-05 10:26:00'),
(5, 107000, 'Cash', 'Paid', 'CASH-SL-20260602-005', '2026-06-02 16:06:00', '2026-06-02 16:55:00'),
(6, 44000, 'Momo', 'Failed', 'MOMO-SL-20260601-006', '2026-06-01 19:31:00', NULL);

UPDATE order_deliveries
SET driver_id = 1,
    pickup_address = 'SOL & LUNA Nguyễn Trãi',
    status = 'Delivered',
    estimated_arrival = '2026-06-03 12:10:00',
    delivered_at = '2026-06-03 12:04:00'
WHERE order_id = 1;

UPDATE order_deliveries
SET driver_id = 2,
    pickup_address = 'SOL & LUNA Thảo Điền',
    status = 'Delivering',
    estimated_arrival = '2026-06-04 16:15:00',
    delivered_at = NULL
WHERE order_id = 2;

UPDATE order_deliveries
SET driver_id = NULL,
    pickup_address = 'SOL & LUNA Nguyễn Trãi',
    status = 'Assigned',
    estimated_arrival = NULL,
    delivered_at = NULL
WHERE order_id = 3;

UPDATE order_deliveries
SET driver_id = 3,
    pickup_address = 'SOL & LUNA Nguyễn Trãi',
    status = 'Picked_Up',
    estimated_arrival = '2026-06-05 11:00:00',
    delivered_at = NULL
WHERE order_id = 4;

UPDATE order_deliveries
SET driver_id = 4,
    pickup_address = 'SOL & LUNA Cầu Giấy',
    status = 'Delivered',
    estimated_arrival = '2026-06-02 17:10:00',
    delivered_at = '2026-06-02 16:58:00'
WHERE order_id = 5;

UPDATE order_deliveries
SET driver_id = NULL,
    pickup_address = 'SOL & LUNA Nguyễn Trãi',
    status = 'Failed',
    estimated_arrival = NULL,
    delivered_at = NULL
WHERE order_id = 6;

INSERT INTO promotion_usage(user_id, promotion_id, order_id, used_at) VALUES
(3, 3, 1, '2026-06-03 11:20:00'),
(4, 5, 2, '2026-06-04 15:35:00'),
(6, 2, 5, '2026-06-02 16:05:00');

UPDATE promotions SET used_count = 1 WHERE id IN (2, 3, 5);

INSERT INTO loyalty_transactions(user_id, order_id, transaction_type, points, reason, created_at) VALUES
(3, 1, 'earn', 145, 'Tích điểm đơn hàng #1', '2026-06-03 12:05:00'),
(6, 5, 'earn', 128, 'Tích điểm đơn hàng #5', '2026-06-02 17:00:00'),
(4, NULL, 'earn', 300, 'Thưởng giữ hạng VIP tháng 6', '2026-06-01 09:00:00'),
(5, NULL, 'earn', 40, 'Bù điểm sinh nhật khách hàng', '2026-06-04 09:00:00');

INSERT INTO carts(id, user_id, created_at, updated_at) VALUES
(1, 2, '2026-06-05 08:30:00', '2026-06-05 08:45:00'),
(2, 5, '2026-06-05 09:00:00', '2026-06-05 09:05:00'),
(3, 7, '2026-06-05 10:00:00', '2026-06-05 10:02:00');

INSERT INTO cart_items(cart_id, product_id, variant_id, quantity, ice_level, sugar_level, topping_ids, option_hash, created_at, updated_at) VALUES
(1, 6, NULL, 1, 'Bình thường', 'Bình thường', '', 'b7f61c2132a172c1b069e0cfa0a74c152bfc605f', '2026-06-05 08:30:00', '2026-06-05 08:45:00'),
(1, 16, NULL, 1, NULL, NULL, '', 'b7f61c2132a172c1b069e0cfa0a74c152bfc605f', '2026-06-05 08:32:00', '2026-06-05 08:45:00'),
(2, 12, NULL, 2, 'Bình thường', 'Bình thường', '', 'b7f61c2132a172c1b069e0cfa0a74c152bfc605f', '2026-06-05 09:00:00', '2026-06-05 09:05:00'),
(3, 15, NULL, 1, 'Bình thường', 'Bình thường', '', 'b7f61c2132a172c1b069e0cfa0a74c152bfc605f', '2026-06-05 10:00:00', '2026-06-05 10:02:00');

INSERT INTO chat_sessions(id, user_id, title, started_at, ended_at) VALUES
(1, 2, 'Tư vấn món ít ngọt', '2026-06-05 08:20:00', NULL),
(2, 4, 'Gợi ý đồ uống cho nhóm', '2026-06-04 14:50:00', '2026-06-04 15:05:00'),
(3, NULL, 'Khách vãng lai hỏi ưu đãi', '2026-06-05 10:15:00', NULL);

INSERT INTO chat_messages(session_id, sender, message, created_at) VALUES
(1, 'user', 'Xin chào, mình muốn uống món ít ngọt thì chọn gì?', '2026-06-05 08:20:00'),
(1, 'assistant', 'Xin chào Minh Anh, nếu thích ít ngọt bạn có thể chọn trà vải hoa hồng 50% đường hoặc trà chanh mật ong ít đá.', '2026-06-05 08:20:10'),
(1, 'user', 'Có món nào hợp với trân châu không?', '2026-06-05 08:21:00'),
(1, 'assistant', 'Bạn có thể chọn sữa tươi trân châu đường đen và giảm đường xuống 50%, vị vẫn béo nhưng không quá gắt.', '2026-06-05 08:21:12'),
(2, 'user', 'Mình đặt cho 4 người, có món nào dễ uống không?', '2026-06-04 14:50:00'),
(2, 'assistant', 'Bạn thử mix trà sữa truyền thống, trà đào cam sả và trà sữa matcha. Nhóm đông thì nên chọn size M, đường 70%.', '2026-06-04 14:50:20'),
(3, 'user', 'Hôm nay có ưu đãi hội viên không?', '2026-06-05 10:15:00'),
(3, 'assistant', 'Có nhé. Hội viên Gold dùng GOLD5, VIP dùng VIP10 hoặc VIP50K nếu đơn đạt điều kiện.', '2026-06-05 10:15:14');

INSERT INTO activity_logs(user_id, action, entity_type, entity_id, ip_address, user_agent, created_at) VALUES
(1, 'Tạo phiếu nhập nguyên liệu #4', 'material_imports', 4, '127.0.0.1', 'Admin dashboard seed', '2026-06-04 14:05:00'),
(1, 'Chỉ định tài xế cho đơn hàng #2', 'orders', 2, '127.0.0.1', 'Admin dashboard seed', '2026-06-04 15:42:00'),
(1, 'Cập nhật banner ưu đãi giỏ hàng', 'banners', 5, '127.0.0.1', 'Admin dashboard seed', '2026-06-04 16:10:00'),
(3, 'Khách hàng đặt đơn #1', 'orders', 1, '127.0.0.1', 'Client checkout seed', '2026-06-03 11:20:00');

DELIMITER $$

DROP PROCEDURE IF EXISTS seed_large_demo_data$$
CREATE PROCEDURE seed_large_demo_data()
BEGIN
    DECLARE v_user_id INT DEFAULT 2;
    DECLARE v_order_no INT DEFAULT 1;
    DECLARE v_target_orders INT DEFAULT 0;
    DECLARE v_existing_orders INT DEFAULT 0;
    DECLARE v_orders_to_make INT DEFAULT 0;
    DECLARE v_product1 INT DEFAULT 1;
    DECLARE v_product2 INT DEFAULT 1;
    DECLARE v_topping INT DEFAULT 16;
    DECLARE v_variant1 INT DEFAULT NULL;
    DECLARE v_variant2 INT DEFAULT NULL;
    DECLARE v_qty1 INT DEFAULT 1;
    DECLARE v_qty2 INT DEFAULT 0;
    DECLARE v_topping_qty INT DEFAULT 0;
    DECLARE v_price1 DECIMAL(10,2) DEFAULT 0;
    DECLARE v_price2 DECIMAL(10,2) DEFAULT 0;
    DECLARE v_topping_price DECIMAL(10,2) DEFAULT 0;
    DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0;
    DECLARE v_discount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_promo_id INT DEFAULT NULL;
    DECLARE v_order_id INT DEFAULT 0;
    DECLARE v_points INT DEFAULT 0;
    DECLARE v_initial_points INT DEFAULT 0;
    DECLARE v_multiplier DECIMAL(5,2) DEFAULT 1;
    DECLARE v_full_name VARCHAR(100);
    DECLARE v_username VARCHAR(100);
    DECLARE v_email VARCHAR(100);
    DECLARE v_phone VARCHAR(20);
    DECLARE v_address VARCHAR(500);
    DECLARE v_rank VARCHAR(10) DEFAULT 'Silver';
    DECLARE v_status VARCHAR(20);
    DECLARE v_method VARCHAR(20);
    DECLARE v_payment_status VARCHAR(20);
    DECLARE v_transaction_code VARCHAR(100);
    DECLARE v_delivery_status VARCHAR(20);
    DECLARE v_pickup VARCHAR(255);
    DECLARE v_note VARCHAR(255);
    DECLARE v_created DATETIME;
    DECLARE v_estimated DATETIME;
    DECLARE v_delivered DATETIME;

    WHILE v_user_id <= 97 DO
        IF v_user_id >= 8 THEN
            SET v_username = CONCAT(
                CASE MOD(v_user_id, 12)
                    WHEN 0 THEN 'minhanh'
                    WHEN 1 THEN 'hoangnam'
                    WHEN 2 THEN 'thuhang'
                    WHEN 3 THEN 'phuonglinh'
                    WHEN 4 THEN 'quanghuy'
                    WHEN 5 THEN 'baotran'
                    WHEN 6 THEN 'kimngan'
                    WHEN 7 THEN 'ducminh'
                    WHEN 8 THEN 'thanhtruc'
                    WHEN 9 THEN 'vietanh'
                    WHEN 10 THEN 'ngochan'
                    ELSE 'giahan'
                END,
                LPAD(v_user_id, 3, '0')
            );

            SET v_full_name = CONCAT(
                CASE MOD(v_user_id, 12)
                    WHEN 0 THEN 'Nguyễn'
                    WHEN 1 THEN 'Trần'
                    WHEN 2 THEN 'Lê'
                    WHEN 3 THEN 'Phạm'
                    WHEN 4 THEN 'Hoàng'
                    WHEN 5 THEN 'Vũ'
                    WHEN 6 THEN 'Đỗ'
                    WHEN 7 THEN 'Bùi'
                    WHEN 8 THEN 'Đặng'
                    WHEN 9 THEN 'Mai'
                    WHEN 10 THEN 'Dương'
                    ELSE 'Huỳnh'
                END,
                ' ',
                CASE MOD(v_user_id * 3, 10)
                    WHEN 0 THEN 'Minh'
                    WHEN 1 THEN 'Hoàng'
                    WHEN 2 THEN 'Thu'
                    WHEN 3 THEN 'Phương'
                    WHEN 4 THEN 'Quang'
                    WHEN 5 THEN 'Bảo'
                    WHEN 6 THEN 'Kim'
                    WHEN 7 THEN 'Đức'
                    WHEN 8 THEN 'Thanh'
                    ELSE 'Gia'
                END,
                ' ',
                CASE MOD(v_user_id * 5, 14)
                    WHEN 0 THEN 'Anh'
                    WHEN 1 THEN 'Nam'
                    WHEN 2 THEN 'Hằng'
                    WHEN 3 THEN 'Linh'
                    WHEN 4 THEN 'Huy'
                    WHEN 5 THEN 'Trân'
                    WHEN 6 THEN 'Ngân'
                    WHEN 7 THEN 'Minh'
                    WHEN 8 THEN 'Trúc'
                    WHEN 9 THEN 'Việt'
                    WHEN 10 THEN 'Hân'
                    WHEN 11 THEN 'Hà'
                    WHEN 12 THEN 'Khang'
                    ELSE 'Vy'
                END
            );

            SET v_email = CONCAT(v_username, '@sol-luna.local');
            SET v_phone = CONCAT('09', LPAD(10000000 + v_user_id * 137, 8, '0'));
            SET v_address = CONCAT(
                CASE MOD(v_user_id, 12)
                    WHEN 0 THEN '18 Nguyễn Thị Minh Khai'
                    WHEN 1 THEN '42 Pasteur'
                    WHEN 2 THEN '77 Trần Hưng Đạo'
                    WHEN 3 THEN '125 Lê Văn Sỹ'
                    WHEN 4 THEN '31 Võ Văn Tần'
                    WHEN 5 THEN '64 Nguyễn Đình Chiểu'
                    WHEN 6 THEN '9 Phan Xích Long'
                    WHEN 7 THEN '26 Huỳnh Văn Bánh'
                    WHEN 8 THEN '58 Quốc Hương'
                    WHEN 9 THEN '101 Cầu Giấy'
                    WHEN 10 THEN '14 Trần Duy Hưng'
                    ELSE '36 Lý Thường Kiệt'
                END,
                ', ',
                CASE MOD(v_user_id, 8)
                    WHEN 0 THEN 'Phường Bến Thành, Quận 1, TP.HCM'
                    WHEN 1 THEN 'Phường Võ Thị Sáu, Quận 3, TP.HCM'
                    WHEN 2 THEN 'Phường 13, Quận 3, TP.HCM'
                    WHEN 3 THEN 'Phường Thảo Điền, TP. Thủ Đức, TP.HCM'
                    WHEN 4 THEN 'Phường Đa Kao, Quận 1, TP.HCM'
                    WHEN 5 THEN 'Phường 2, Quận Phú Nhuận, TP.HCM'
                    WHEN 6 THEN 'Phường Quan Hoa, Cầu Giấy, Hà Nội'
                    ELSE 'Phường Trung Hòa, Cầu Giấy, Hà Nội'
                END
            );

            SET v_initial_points = CASE
                WHEN MOD(v_user_id, 11) = 0 THEN 1550 + MOD(v_user_id * 31, 850)
                WHEN MOD(v_user_id, 4) = 0 OR MOD(v_user_id, 5) = 0 THEN 520 + MOD(v_user_id * 23, 800)
                ELSE MOD(v_user_id * 37, 480)
            END;

            SET v_rank = CASE
                WHEN v_initial_points >= 1500 THEN 'VIP'
                WHEN v_initial_points >= 500 THEN 'Gold'
                ELSE 'Silver'
            END;

            INSERT INTO users(id, role_id, username, password_hash, is_active)
            VALUES(v_user_id, 2, v_username, '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c', TRUE);

            INSERT INTO customer_profiles(user_id, full_name, email, phone, address, loyalty_points, membership_rank)
            VALUES(v_user_id, v_full_name, v_email, v_phone, v_address, v_initial_points, v_rank);
        END IF;

        SELECT full_name, phone, address, membership_rank
        INTO v_full_name, v_phone, v_address, v_rank
        FROM customer_profiles
        WHERE user_id = v_user_id
        LIMIT 1;

        SET v_target_orders = 15 + MOD(v_user_id * 7, 26);
        SELECT COUNT(*) INTO v_existing_orders FROM orders WHERE user_id = v_user_id;
        SET v_orders_to_make = GREATEST(v_target_orders - v_existing_orders, 0);
        SET v_order_no = 1;

        WHILE v_order_no <= v_orders_to_make DO
            SET v_created = DATE_ADD(
                DATE_SUB('2026-06-05 09:00:00', INTERVAL MOD(v_user_id * 13 + v_order_no * 5, 165) DAY),
                INTERVAL (480 + MOD(v_user_id * 17 + v_order_no * 31, 660)) MINUTE
            );
            SET v_product1 = 1 + MOD(v_user_id + v_order_no * 3, 15);
            SET v_product2 = 1 + MOD(v_user_id * 2 + v_order_no * 5, 15);
            SET v_topping = 16 + MOD(v_user_id + v_order_no, 3);
            SET v_qty1 = 1 + MOD(v_user_id + v_order_no, 2);
            SET v_qty2 = CASE WHEN MOD(v_user_id + v_order_no, 4) = 0 THEN 0 ELSE 1 END;
            SET v_topping_qty = CASE WHEN MOD(v_user_id * v_order_no, 3) = 0 THEN 1 ELSE 0 END;

            SELECT price INTO v_price1 FROM products WHERE id = v_product1;
            SELECT price INTO v_price2 FROM products WHERE id = v_product2;
            SELECT price INTO v_topping_price FROM products WHERE id = v_topping;
            SELECT id INTO v_variant1 FROM product_variants WHERE product_id = v_product1 AND variant_name = 'M' LIMIT 1;
            SELECT id INTO v_variant2 FROM product_variants WHERE product_id = v_product2 AND variant_name = 'M' LIMIT 1;

            SET v_subtotal = (v_price1 * v_qty1) + (v_price2 * v_qty2) + (v_topping_price * v_topping_qty);
            SET v_status = CASE
                WHEN MOD(v_user_id + v_order_no, 19) = 0 THEN 'Cancelled'
                WHEN MOD(v_user_id + v_order_no, 17) = 0 THEN 'Pending'
                WHEN MOD(v_user_id + v_order_no, 13) = 0 THEN 'Paid'
                WHEN MOD(v_user_id + v_order_no, 11) = 0 THEN 'Preparing'
                ELSE 'Completed'
            END;

            SET v_promo_id = NULL;
            IF v_status <> 'Cancelled' THEN
                IF v_rank = 'VIP' AND v_subtotal >= 100000 AND MOD(v_user_id + v_order_no, 10) = 0 THEN
                    SET v_promo_id = 5;
                ELSEIF v_rank IN ('Gold', 'VIP') AND v_subtotal >= 70000 AND MOD(v_user_id + v_order_no, 7) = 0 THEN
                    SET v_promo_id = 3;
                ELSEIF v_subtotal >= 80000 AND MOD(v_user_id + v_order_no, 5) = 0 THEN
                    SET v_promo_id = 2;
                ELSEIF v_subtotal >= 50000 AND MOD(v_user_id + v_order_no, 9) = 0 THEN
                    SET v_promo_id = 1;
                END IF;
            END IF;

            SET v_discount = CASE v_promo_id
                WHEN 1 THEN ROUND(v_subtotal * 0.20, 0)
                WHEN 2 THEN LEAST(15000, v_subtotal)
                WHEN 3 THEN ROUND(v_subtotal * 0.05, 0)
                WHEN 5 THEN ROUND(v_subtotal * 0.10, 0)
                ELSE 0
            END;
            SET v_total = v_subtotal - v_discount;
            SET v_note = CASE MOD(v_user_id + v_order_no, 8)
                WHEN 0 THEN 'Ít đá, giao giờ nghỉ trưa.'
                WHEN 1 THEN 'Gọi trước khi giao giúp mình.'
                WHEN 2 THEN 'Để riêng topping trong túi nhỏ.'
                WHEN 3 THEN 'Không lấy ống hút nhựa.'
                WHEN 4 THEN 'Đơn cho văn phòng, chia túi riêng.'
                WHEN 5 THEN 'Đường 50%, đá bình thường.'
                WHEN 6 THEN 'Giao ở quầy lễ tân.'
                ELSE 'Khách quen, đóng gói chắc tay.'
            END;

            INSERT INTO orders
                (user_id, promotion_id, receiver_name, receiver_phone, delivery_address, subtotal, discount_amount, total_amount, status, note, created_at, updated_at)
            VALUES
                (v_user_id, v_promo_id, v_full_name, v_phone, v_address, v_subtotal, v_discount, v_total, v_status, v_note, v_created, DATE_ADD(v_created, INTERVAL 5 MINUTE));

            SET v_order_id = LAST_INSERT_ID();

            INSERT INTO order_details(order_id, product_id, variant_id, quantity, unit_price, subtotal, ice_level, sugar_level, created_at)
            VALUES(v_order_id, v_product1, v_variant1, v_qty1, v_price1, v_price1 * v_qty1,
                CASE MOD(v_order_id, 3) WHEN 0 THEN 'Ít đá' WHEN 1 THEN 'Bình thường' ELSE 'Không đá' END,
                CASE MOD(v_order_id, 3) WHEN 0 THEN '50%' WHEN 1 THEN '70%' ELSE '30%' END,
                v_created);

            IF v_qty2 > 0 THEN
                INSERT INTO order_details(order_id, product_id, variant_id, quantity, unit_price, subtotal, ice_level, sugar_level, created_at)
                VALUES(v_order_id, v_product2, v_variant2, v_qty2, v_price2, v_price2 * v_qty2,
                    CASE MOD(v_order_id + 1, 3) WHEN 0 THEN 'Ít đá' WHEN 1 THEN 'Bình thường' ELSE 'Không đá' END,
                    CASE MOD(v_order_id + 1, 3) WHEN 0 THEN '50%' WHEN 1 THEN '70%' ELSE '30%' END,
                    v_created);
            END IF;

            IF v_topping_qty > 0 THEN
                INSERT INTO order_details(order_id, product_id, variant_id, quantity, unit_price, subtotal, ice_level, sugar_level, created_at)
                VALUES(v_order_id, v_topping, NULL, v_topping_qty, v_topping_price, v_topping_price * v_topping_qty, NULL, NULL, v_created);
            END IF;

            SET v_method = ELT(1 + MOD(v_order_id, 4), 'Cash', 'Card', 'Momo', 'VNPay');
            SET v_payment_status = CASE
                WHEN v_status IN ('Completed', 'Preparing', 'Paid') THEN 'Paid'
                WHEN v_status = 'Cancelled' THEN 'Failed'
                ELSE 'Pending'
            END;
            SET v_transaction_code = CASE
                WHEN v_payment_status = 'Pending' THEN NULL
                ELSE CONCAT(UPPER(v_method), '-SEED-', LPAD(v_order_id, 6, '0'))
            END;

            INSERT INTO payments(order_id, amount, method, status, transaction_code, created_at, paid_at)
            VALUES(
                v_order_id,
                v_total,
                v_method,
                v_payment_status,
                v_transaction_code,
                DATE_ADD(v_created, INTERVAL 1 MINUTE),
                CASE WHEN v_payment_status = 'Paid' THEN DATE_ADD(v_created, INTERVAL 1 MINUTE) ELSE NULL END
            );

            SET v_pickup = CASE
                WHEN MOD(v_user_id, 8) IN (6, 7) THEN 'SOL & LUNA Cầu Giấy'
                WHEN MOD(v_user_id, 8) = 3 THEN 'SOL & LUNA Thảo Điền'
                ELSE 'SOL & LUNA Nguyễn Trãi'
            END;
            SET v_estimated = DATE_ADD(v_created, INTERVAL (35 + MOD(v_order_id, 25)) MINUTE);
            SET v_delivered = DATE_ADD(v_created, INTERVAL (38 + MOD(v_order_id, 30)) MINUTE);
            SET v_delivery_status = CASE
                WHEN v_status = 'Completed' THEN 'Delivered'
                WHEN v_status = 'Preparing' THEN 'Assigned'
                WHEN v_status = 'Paid' THEN 'Picked_Up'
                WHEN v_status = 'Cancelled' THEN 'Failed'
                ELSE 'Assigned'
            END;

            UPDATE order_deliveries
            SET driver_id = CASE WHEN v_status IN ('Pending', 'Cancelled') THEN NULL ELSE 1 + MOD(v_order_id, 4) END,
                pickup_address = v_pickup,
                status = v_delivery_status,
                estimated_arrival = CASE WHEN v_status IN ('Pending', 'Cancelled') THEN NULL ELSE v_estimated END,
                delivered_at = CASE WHEN v_status = 'Completed' THEN v_delivered ELSE NULL END
            WHERE order_id = v_order_id;

            IF v_promo_id IS NOT NULL AND v_status <> 'Cancelled' THEN
                INSERT INTO promotion_usage(user_id, promotion_id, order_id, used_at)
                VALUES(v_user_id, v_promo_id, v_order_id, v_created);
            END IF;

            IF v_status = 'Completed' THEN
                SET v_multiplier = CASE v_rank WHEN 'VIP' THEN 1.50 WHEN 'Gold' THEN 1.20 ELSE 1.00 END;
                SET v_points = FLOOR((v_total / 1000) * v_multiplier);
                IF v_points > 0 THEN
                    INSERT INTO loyalty_transactions(user_id, order_id, transaction_type, points, reason, created_at)
                    VALUES(v_user_id, v_order_id, 'earn', v_points, CONCAT('Tích điểm đơn hàng #', v_order_id), v_delivered);

                    UPDATE customer_profiles
                    SET loyalty_points = loyalty_points + v_points
                    WHERE user_id = v_user_id;
                END IF;
            END IF;

            SET v_order_no = v_order_no + 1;
        END WHILE;

        CALL refresh_customer_membership(v_user_id);
        SET v_user_id = v_user_id + 1;
    END WHILE;

    UPDATE products
    SET view_count = view_count + 800 + MOD(id * 83, 900)
    WHERE id > 0;

    UPDATE products p
    LEFT JOIN (
        SELECT od.product_id, SUM(od.quantity) AS sold_quantity
        FROM order_details od
        JOIN orders o ON o.id = od.order_id
        WHERE o.status = 'Completed'
        GROUP BY od.product_id
    ) sold ON sold.product_id = p.id
    SET p.sales_count = GREATEST(p.sales_count, COALESCE(sold.sold_quantity, 0))
    WHERE p.id > 0;

    UPDATE promotions p
    SET used_count = (
        SELECT COUNT(*)
        FROM promotion_usage pu
        WHERE pu.promotion_id = p.id
    )
    WHERE p.id > 0;
END$$

DELIMITER ;

CALL seed_large_demo_data();
CALL refresh_revenue_statistics();
DROP PROCEDURE IF EXISTS seed_large_demo_data;
