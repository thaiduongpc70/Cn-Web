const resourceDefinitions = {
  roles: {
    table: 'roles',
    fields: ['name'],
    listSql: 'SELECT * FROM roles ORDER BY id ASC'
  },
  users: {
    table: 'users',
    fields: ['role_id', 'username', 'password_hash', 'is_active'],
    listSql: `SELECT u.id, u.role_id, r.name AS role_name, u.username, u.is_active,
                     cp.full_name, cp.email, cp.phone, cp.loyalty_points, cp.membership_rank,
                     u.created_at, u.updated_at
              FROM users u
              LEFT JOIN roles r ON r.id = u.role_id
              LEFT JOIN customer_profiles cp ON cp.user_id = u.id
              ORDER BY u.id DESC`
  },
  'customer-profiles': {
    table: 'customer_profiles',
    fields: ['user_id', 'full_name', 'email', 'phone', 'address', 'loyalty_points', 'membership_rank'],
    listSql: `SELECT cp.*, u.username
              FROM customer_profiles cp
              JOIN users u ON u.id = cp.user_id
              ORDER BY cp.id DESC`
  },
  'membership-tiers': {
    table: 'membership_tiers',
    fields: [
      'rank_name',
      'min_points',
      'discount_percent',
      'point_multiplier',
      'birthday_reward_amount',
      'free_shipping_min_order',
      'benefits',
      'is_active'
    ],
    listSql: 'SELECT * FROM membership_tiers ORDER BY min_points ASC'
  },
  categories: {
    table: 'categories',
    fields: ['name', 'description'],
    listSql: 'SELECT * FROM categories ORDER BY id DESC'
  },
  suppliers: {
    table: 'suppliers',
    fields: [
      'name',
      'contact_name',
      'phone',
      'email',
      'address',
      'tax_code',
      'bank_name',
      'bank_account',
      'payment_terms',
      'lead_time_days',
      'note',
      'is_active'
    ],
    listSql: 'SELECT * FROM suppliers ORDER BY is_active DESC, id DESC'
  },
  products: {
    table: 'products',
    fields: [
      'category_id',
      'name',
      'description',
      'short_description',
      'price',
      'base_cost',
      'barcode',
      'sku',
      'stock_quantity',
      'min_stock_level',
      'recipe_required',
      'recipe_status',
      'preparation_minutes',
      'view_count',
      'sales_count',
      'is_active',
      'image_url'
    ],
    listSql: `SELECT p.id, p.category_id, p.name, p.description, p.short_description,
                     p.price, p.base_cost, p.barcode, p.sku, p.stock_quantity,
                     p.min_stock_level, p.recipe_required, p.recipe_status,
                     p.preparation_minutes, p.view_count,
                     GREATEST(COALESCE(p.sales_count, 0), COALESCE(completed_sales.sold_quantity, 0)) AS sales_count,
                     (best_rank.id IS NOT NULL) AS is_best_seller,
                     p.is_active, p.created_at, p.updated_at,
                     c.name AS category_name,
                     COALESCE(pi.image_url, '') AS image_url
              FROM products p
              LEFT JOIN categories c ON c.id = p.category_id
              LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
              LEFT JOIN (
                SELECT od.product_id, SUM(od.quantity) AS sold_quantity
                FROM order_details od
                JOIN orders o ON o.id = od.order_id
                WHERE o.status = 'Completed'
                GROUP BY od.product_id
              ) completed_sales ON completed_sales.product_id = p.id
              LEFT JOIN (
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
                  LIMIT 12
                ) ranked
              ) best_rank ON best_rank.id = p.id
              ORDER BY p.id DESC`
  },
  'product-images': {
    table: 'product_images',
    fields: ['product_id', 'image_url', 'is_primary', 'display_order'],
    listSql: `SELECT pi.*, p.name AS product_name
              FROM product_images pi
              JOIN products p ON p.id = pi.product_id
              ORDER BY pi.product_id ASC, pi.display_order ASC, pi.id DESC`
  },
  'product-variants': {
    table: 'product_variants',
    fields: ['product_id', 'variant_name', 'price_adjustment', 'recipe_multiplier', 'cup_volume_ml', 'display_order'],
    listSql: `SELECT pv.*, p.name AS product_name
              FROM product_variants pv
              JOIN products p ON p.id = pv.product_id
              ORDER BY pv.product_id ASC, pv.display_order ASC, pv.id ASC`
  },
  'product-discounts': {
    table: 'product_discounts',
    fields: ['title', 'scope', 'category_id', 'product_id', 'discount_type', 'discount_value', 'start_date', 'end_date', 'priority', 'is_active'],
    listSql: `SELECT pd.id, pd.title, pd.scope, c.name AS category_name, p.name AS product_name,
                     pd.discount_type, pd.discount_value, pd.start_date, pd.end_date,
                     pd.priority, pd.is_active, pd.created_at, pd.updated_at,
                     pd.category_id, pd.product_id
              FROM product_discounts pd
              LEFT JOIN categories c ON c.id = pd.category_id
              LEFT JOIN products p ON p.id = pd.product_id
              ORDER BY pd.is_active DESC, pd.priority DESC, pd.end_date DESC, pd.id DESC`
  },
  materials: {
    table: 'materials',
    fields: [
      'supplier_id',
      'name',
      'material_code',
      'material_type',
      'unit',
      'recipe_unit',
      'conversion_rate',
      'stock_quantity',
      'min_stock_level',
      'reorder_point',
      'last_import_price',
      'average_cost',
      'stock_value',
      'shelf_life_days',
      'storage_note',
      'is_active'
    ],
    listSql: `SELECT m.*, s.name AS supplier_name
              FROM materials m
              LEFT JOIN suppliers s ON s.id = m.supplier_id
              ORDER BY m.is_active DESC, m.stock_quantity <= m.reorder_point DESC, m.id DESC`
  },
  'product-recipes': {
    table: 'product_recipes',
    fields: ['product_id', 'variant_id', 'material_id', 'step_name', 'step_order', 'quantity', 'loss_percent', 'is_optional', 'note'],
    listSql: `SELECT pr.*, p.name AS product_name, COALESCE(pv.variant_name, 'Mọi size') AS variant_name,
                     m.name AS material_name, m.unit, m.recipe_unit, m.material_type
              FROM product_recipes pr
              JOIN products p ON p.id = pr.product_id
              LEFT JOIN product_variants pv ON pv.id = pr.variant_id
              JOIN materials m ON m.id = pr.material_id
              ORDER BY pr.product_id ASC, COALESCE(pv.display_order, 0) ASC, pr.step_order ASC, pr.id ASC`
  },
  'material-imports': {
    table: 'material_imports',
    fields: ['import_code', 'supplier_id', 'admin_id', 'status', 'total_amount', 'paid_amount', 'import_date', 'expected_date', 'invoice_number', 'note'],
    listSql: `SELECT mi.*, s.name AS supplier_name, u.username AS admin_username,
                     COUNT(idt.id) AS detail_count
              FROM material_imports mi
              LEFT JOIN suppliers s ON s.id = mi.supplier_id
              JOIN users u ON u.id = mi.admin_id
              LEFT JOIN import_details idt ON idt.import_id = mi.id
              GROUP BY mi.id
              ORDER BY mi.import_date DESC, mi.id DESC`
  },
  'import-details': {
    table: 'import_details',
    fields: ['import_id', 'material_id', 'batch_code', 'quantity', 'unit_price', 'subtotal', 'manufacturing_date', 'expiry_date', 'note'],
    listSql: `SELECT idt.*, m.name AS material_name, m.unit, mi.import_code, mi.import_date
              FROM import_details idt
              JOIN materials m ON m.id = idt.material_id
              JOIN material_imports mi ON mi.id = idt.import_id
              ORDER BY idt.id DESC`
  },
  'material-batches': {
    table: 'material_batches',
    fields: [
      'import_detail_id',
      'material_id',
      'supplier_id',
      'batch_code',
      'initial_quantity',
      'remaining_quantity',
      'unit_price',
      'manufacturing_date',
      'expiry_date',
      'received_at',
      'is_closed'
    ],
    listSql: `SELECT mb.*, m.name AS material_name, m.unit, s.name AS supplier_name,
                     idt.import_id, mi.import_code
              FROM material_batches mb
              JOIN materials m ON m.id = mb.material_id
              LEFT JOIN suppliers s ON s.id = mb.supplier_id
              LEFT JOIN import_details idt ON idt.id = mb.import_detail_id
              LEFT JOIN material_imports mi ON mi.id = idt.import_id
              ORDER BY mb.is_closed ASC, mb.expiry_date IS NULL ASC, mb.expiry_date ASC, mb.id DESC`
  },
  'inventory-transactions': {
    table: 'inventory_transactions',
    fields: [
      'material_id',
      'batch_id',
      'transaction_type',
      'reference_type',
      'reference_id',
      'quantity_change',
      'unit_cost',
      'stock_after',
      'note',
      'created_by'
    ],
    listSql: `SELECT it.*, m.name AS material_name, m.unit, mb.batch_code, u.username AS created_by_username
              FROM inventory_transactions it
              JOIN materials m ON m.id = it.material_id
              LEFT JOIN material_batches mb ON mb.id = it.batch_id
              LEFT JOIN users u ON u.id = it.created_by
              ORDER BY it.created_at DESC, it.id DESC`
  },
  'revenue-daily-stats': {
    table: 'revenue_daily_stats',
    fields: ['stat_date', 'gross_revenue', 'discount_amount', 'net_revenue', 'paid_amount', 'completed_orders', 'cancelled_orders', 'total_orders', 'items_sold', 'average_order_value'],
    readOnly: true,
    listSql: `SELECT DATE_FORMAT(stat_date, '%Y-%m-%d') AS id, revenue_daily_stats.*
              FROM revenue_daily_stats
              ORDER BY stat_date DESC`
  },
  'revenue-monthly-stats': {
    table: 'revenue_monthly_stats',
    fields: ['stat_year', 'stat_month', 'gross_revenue', 'discount_amount', 'net_revenue', 'paid_amount', 'completed_orders', 'cancelled_orders', 'total_orders', 'items_sold', 'average_order_value'],
    readOnly: true,
    listSql: `SELECT CONCAT(stat_year, '-', LPAD(stat_month, 2, '0')) AS id, revenue_monthly_stats.*
              FROM revenue_monthly_stats
              ORDER BY stat_year DESC, stat_month DESC`
  },
  'revenue-quarterly-stats': {
    table: 'revenue_quarterly_stats',
    fields: ['stat_year', 'stat_quarter', 'gross_revenue', 'discount_amount', 'net_revenue', 'paid_amount', 'completed_orders', 'cancelled_orders', 'total_orders', 'items_sold', 'average_order_value'],
    readOnly: true,
    listSql: `SELECT CONCAT(stat_year, '-Q', stat_quarter) AS id, revenue_quarterly_stats.*
              FROM revenue_quarterly_stats
              ORDER BY stat_year DESC, stat_quarter DESC`
  },
  'revenue-yearly-stats': {
    table: 'revenue_yearly_stats',
    fields: ['stat_year', 'gross_revenue', 'discount_amount', 'net_revenue', 'paid_amount', 'completed_orders', 'cancelled_orders', 'total_orders', 'items_sold', 'average_order_value'],
    readOnly: true,
    listSql: `SELECT stat_year AS id, revenue_yearly_stats.*
              FROM revenue_yearly_stats
              ORDER BY stat_year DESC`
  },
  'invoice-daily-stats': {
    table: 'invoice_daily_stats',
    fields: ['stat_date', 'invoice_count', 'pending_count', 'paid_count', 'preparing_count', 'completed_count', 'cancelled_count', 'refunded_count', 'cash_count', 'online_count'],
    readOnly: true,
    listSql: `SELECT DATE_FORMAT(stat_date, '%Y-%m-%d') AS id, invoice_daily_stats.*
              FROM invoice_daily_stats
              ORDER BY stat_date DESC`
  },
  'invoice-monthly-stats': {
    table: 'invoice_monthly_stats',
    fields: ['stat_year', 'stat_month', 'invoice_count', 'pending_count', 'paid_count', 'preparing_count', 'completed_count', 'cancelled_count', 'refunded_count', 'cash_count', 'online_count'],
    readOnly: true,
    listSql: `SELECT CONCAT(stat_year, '-', LPAD(stat_month, 2, '0')) AS id, invoice_monthly_stats.*
              FROM invoice_monthly_stats
              ORDER BY stat_year DESC, stat_month DESC`
  },
  'invoice-quarterly-stats': {
    table: 'invoice_quarterly_stats',
    fields: ['stat_year', 'stat_quarter', 'invoice_count', 'pending_count', 'paid_count', 'preparing_count', 'completed_count', 'cancelled_count', 'refunded_count', 'cash_count', 'online_count'],
    readOnly: true,
    listSql: `SELECT CONCAT(stat_year, '-Q', stat_quarter) AS id, invoice_quarterly_stats.*
              FROM invoice_quarterly_stats
              ORDER BY stat_year DESC, stat_quarter DESC`
  },
  'invoice-yearly-stats': {
    table: 'invoice_yearly_stats',
    fields: ['stat_year', 'invoice_count', 'pending_count', 'paid_count', 'preparing_count', 'completed_count', 'cancelled_count', 'refunded_count', 'cash_count', 'online_count'],
    readOnly: true,
    listSql: `SELECT stat_year AS id, invoice_yearly_stats.*
              FROM invoice_yearly_stats
              ORDER BY stat_year DESC`
  },
  carts: {
    table: 'carts',
    fields: ['user_id'],
    listSql: `SELECT c.*, u.username, cp.full_name,
                     COUNT(ci.id) AS item_count
              FROM carts c
              JOIN users u ON u.id = c.user_id
              LEFT JOIN customer_profiles cp ON cp.user_id = u.id
              LEFT JOIN cart_items ci ON ci.cart_id = c.id
              GROUP BY c.id
              ORDER BY c.updated_at DESC`
  },
  'cart-items': {
    table: 'cart_items',
    fields: ['cart_id', 'product_id', 'variant_id', 'quantity', 'ice_level', 'sugar_level', 'topping_ids', 'option_hash'],
    listSql: `SELECT ci.*, u.username, p.name AS product_name, pv.variant_name
              FROM cart_items ci
              JOIN carts c ON c.id = ci.cart_id
              JOIN users u ON u.id = c.user_id
              JOIN products p ON p.id = ci.product_id
              LEFT JOIN product_variants pv ON pv.id = ci.variant_id
              ORDER BY ci.updated_at DESC`
  },
  promotions: {
    table: 'promotions',
    fields: [
      'code',
      'title',
      'description',
      'discount_type',
      'discount_value',
      'minimum_order_amount',
      'required_membership_rank',
      'usage_limit',
      'used_count',
      'start_date',
      'end_date',
      'is_active'
    ],
    listSql: 'SELECT * FROM promotions ORDER BY is_active DESC, end_date DESC, id DESC'
  },
  'member-gift-codes': {
    table: 'member_gift_codes',
    fields: [
      'membership_tier_id',
      'code',
      'title',
      'description',
      'gift_type',
      'gift_value',
      'minimum_order_amount',
      'start_date',
      'end_date',
      'usage_limit',
      'used_count',
      'is_active'
    ],
    listSql: `SELECT mgc.*, mt.rank_name
              FROM member_gift_codes mgc
              JOIN membership_tiers mt ON mt.id = mgc.membership_tier_id
              ORDER BY mgc.is_active DESC, mgc.end_date DESC`
  },
  drivers: {
    table: 'drivers',
    fields: ['name', 'phone', 'vehicle_type', 'license_plate', 'is_active'],
    listSql: 'SELECT * FROM drivers ORDER BY is_active DESC, id DESC'
  },
  orders: {
    table: 'orders',
    fields: [
      'user_id',
      'promotion_id',
      'receiver_name',
      'receiver_phone',
      'delivery_address',
      'subtotal',
      'discount_amount',
      'total_amount',
      'status',
      'note'
    ],
    listSql: `SELECT o.*, u.username, cp.full_name, p.code AS promotion_code,
                     od.status AS delivery_status, d.name AS driver_name,
                     pay.method AS payment_method, pay.status AS payment_status
              FROM orders o
              LEFT JOIN users u ON u.id = o.user_id
              LEFT JOIN customer_profiles cp ON cp.user_id = u.id
              LEFT JOIN promotions p ON p.id = o.promotion_id
              LEFT JOIN order_deliveries od ON od.order_id = o.id
              LEFT JOIN drivers d ON d.id = od.driver_id
              LEFT JOIN payments pay ON pay.order_id = o.id
              ORDER BY o.created_at DESC, o.id DESC`
  },
  'order-details': {
    table: 'order_details',
    fields: ['order_id', 'product_id', 'variant_id', 'quantity', 'unit_price', 'subtotal', 'ice_level', 'sugar_level'],
    listSql: `SELECT od.*, p.name AS product_name, pv.variant_name
              FROM order_details od
              JOIN products p ON p.id = od.product_id
              LEFT JOIN product_variants pv ON pv.id = od.variant_id
              ORDER BY od.order_id DESC, od.id DESC`
  },
  'order-deliveries': {
    table: 'order_deliveries',
    fields: ['order_id', 'driver_id', 'pickup_address', 'delivery_address', 'status', 'estimated_arrival', 'delivered_at'],
    listSql: `SELECT od.*, o.status AS order_status, d.name AS driver_name
              FROM order_deliveries od
              JOIN orders o ON o.id = od.order_id
              LEFT JOIN drivers d ON d.id = od.driver_id
              ORDER BY od.updated_at DESC, od.id DESC`
  },
  payments: {
    table: 'payments',
    fields: ['order_id', 'amount', 'method', 'status', 'transaction_code', 'paid_at'],
    listSql: `SELECT pay.*, o.receiver_name, o.total_amount
              FROM payments pay
              JOIN orders o ON o.id = pay.order_id
              ORDER BY pay.created_at DESC`
  },
  'promotion-usage': {
    table: 'promotion_usage',
    fields: ['user_id', 'promotion_id', 'order_id', 'used_at'],
    listSql: `SELECT pu.*, u.username, p.code AS promotion_code
              FROM promotion_usage pu
              JOIN users u ON u.id = pu.user_id
              JOIN promotions p ON p.id = pu.promotion_id
              ORDER BY pu.used_at DESC`
  },
  'loyalty-transactions': {
    table: 'loyalty_transactions',
    fields: ['user_id', 'order_id', 'transaction_type', 'points', 'reason'],
    listSql: `SELECT lt.*, u.username, cp.full_name
              FROM loyalty_transactions lt
              JOIN users u ON u.id = lt.user_id
              LEFT JOIN customer_profiles cp ON cp.user_id = u.id
              ORDER BY lt.created_at DESC`
  },
  'activity-logs': {
    table: 'activity_logs',
    fields: ['user_id', 'action', 'entity_type', 'entity_id', 'ip_address', 'user_agent'],
    listSql: `SELECT al.*, u.username
              FROM activity_logs al
              LEFT JOIN users u ON u.id = al.user_id
              ORDER BY al.created_at DESC`
  },
  banners: {
    table: 'banners',
    fields: ['title', 'image_url', 'target_link', 'placement', 'display_order', 'is_active', 'starts_at', 'ends_at'],
    listSql: 'SELECT * FROM banners ORDER BY placement ASC, display_order ASC, id DESC'
  },
  stores: {
    table: 'stores',
    fields: ['name', 'address', 'district', 'city', 'phone', 'opening_hours', 'map_url', 'image_url', 'is_active', 'display_order'],
    listSql: 'SELECT * FROM stores ORDER BY is_active DESC, display_order ASC, id DESC'
  },
  'news-posts': {
    table: 'news_posts',
    fields: ['title', 'slug', 'excerpt', 'content', 'image_url', 'post_type', 'is_published', 'published_at'],
    listSql: 'SELECT * FROM news_posts ORDER BY published_at DESC, id DESC'
  },
  'chat-sessions': {
    table: 'chat_sessions',
    fields: ['user_id', 'title', 'ended_at'],
    listSql: `SELECT cs.*, u.username, cp.full_name, COUNT(cm.id) AS message_count
              FROM chat_sessions cs
              LEFT JOIN users u ON u.id = cs.user_id
              LEFT JOIN customer_profiles cp ON cp.user_id = u.id
              LEFT JOIN chat_messages cm ON cm.session_id = cs.id
              GROUP BY cs.id
              ORDER BY cs.started_at DESC`
  },
  'chat-messages': {
    table: 'chat_messages',
    fields: ['session_id', 'sender', 'message'],
    listSql: `SELECT cm.*, cs.title
              FROM chat_messages cm
              JOIN chat_sessions cs ON cs.id = cm.session_id
              ORDER BY cm.created_at DESC, cm.id DESC`
  }
};

const resourceFilterConfig = {
  roles: { searchColumns: ['id', 'name'] },
  users: { searchColumns: ['id', 'username', 'role_name', 'full_name', 'email', 'phone', 'membership_rank'], dateColumn: 'created_at' },
  'customer-profiles': { searchColumns: ['id', 'user_id', 'username', 'full_name', 'email', 'phone', 'address', 'membership_rank'], dateColumn: 'created_at', statusColumn: 'membership_rank' },
  'membership-tiers': { searchColumns: ['id', 'rank_name', 'benefits'], dateColumn: 'created_at', statusColumn: 'rank_name' },
  categories: { searchColumns: ['id', 'name', 'description'] },
  suppliers: { searchColumns: ['id', 'name', 'contact_name', 'phone', 'email', 'address', 'tax_code', 'payment_terms', 'note'], dateColumn: 'created_at' },
  products: { searchColumns: ['id', 'name', 'description', 'short_description', 'barcode', 'sku', 'category_name', 'recipe_status'], dateColumn: 'created_at', statusColumn: 'recipe_status' },
  'product-images': { searchColumns: ['id', 'product_id', 'product_name', 'image_url'], dateColumn: 'created_at' },
  'product-variants': { searchColumns: ['id', 'product_id', 'product_name', 'variant_name'], dateColumn: 'created_at' },
  'product-discounts': { searchColumns: ['id', 'title', 'scope', 'category_name', 'product_name', 'discount_type'], dateColumn: 'start_date', statusColumn: 'scope' },
  materials: { searchColumns: ['id', 'name', 'material_code', 'material_type', 'unit', 'recipe_unit', 'supplier_name', 'storage_note'], dateColumn: 'created_at', statusColumn: 'material_type' },
  'product-recipes': { searchColumns: ['id', 'product_name', 'variant_name', 'material_name', 'step_name', 'note'] },
  'material-imports': { searchColumns: ['id', 'import_code', 'supplier_name', 'admin_username', 'status', 'invoice_number', 'note'], dateColumn: 'import_date', statusColumn: 'status' },
  'import-details': { searchColumns: ['id', 'import_code', 'batch_code', 'material_name', 'note'], dateColumn: 'import_date' },
  'material-batches': { searchColumns: ['id', 'batch_code', 'material_name', 'supplier_name', 'import_code'], dateColumn: 'received_at' },
  'inventory-transactions': { searchColumns: ['id', 'material_name', 'batch_code', 'transaction_type', 'reference_type', 'reference_id', 'note', 'created_by_username'], dateColumn: 'created_at', statusColumn: 'transaction_type' },
  'revenue-daily-stats': { searchColumns: ['id', 'stat_date'], dateColumn: 'stat_date' },
  'revenue-monthly-stats': { searchColumns: ['id', 'stat_year', 'stat_month'] },
  'revenue-quarterly-stats': { searchColumns: ['id', 'stat_year', 'stat_quarter'] },
  'revenue-yearly-stats': { searchColumns: ['id', 'stat_year'] },
  'invoice-daily-stats': { searchColumns: ['id', 'stat_date'], dateColumn: 'stat_date' },
  'invoice-monthly-stats': { searchColumns: ['id', 'stat_year', 'stat_month'] },
  'invoice-quarterly-stats': { searchColumns: ['id', 'stat_year', 'stat_quarter'] },
  'invoice-yearly-stats': { searchColumns: ['id', 'stat_year'] },
  carts: { searchColumns: ['id', 'user_id', 'username', 'full_name'], dateColumn: 'updated_at' },
  'cart-items': { searchColumns: ['id', 'username', 'product_name', 'variant_name', 'ice_level', 'sugar_level'], dateColumn: 'updated_at' },
  promotions: { searchColumns: ['id', 'code', 'title', 'description', 'discount_type', 'required_membership_rank'], dateColumn: 'start_date', statusColumn: 'discount_type' },
  'member-gift-codes': { searchColumns: ['id', 'code', 'title', 'description', 'gift_type', 'rank_name'], dateColumn: 'start_date', statusColumn: 'gift_type' },
  drivers: { searchColumns: ['id', 'name', 'phone', 'vehicle_type', 'license_plate'], dateColumn: 'created_at' },
  orders: { searchColumns: ['id', 'receiver_name', 'receiver_phone', 'delivery_address', 'status', 'note', 'username', 'full_name', 'promotion_code', 'delivery_status', 'driver_name', 'payment_method', 'payment_status'], dateColumn: 'created_at', statusColumn: 'status' },
  'order-details': { searchColumns: ['id', 'order_id', 'product_name', 'variant_name', 'ice_level', 'sugar_level'], dateColumn: 'created_at' },
  'order-deliveries': { searchColumns: ['id', 'order_id', 'status', 'order_status', 'driver_name', 'pickup_address', 'delivery_address'], dateColumn: 'created_at', statusColumn: 'status' },
  payments: { searchColumns: ['id', 'order_id', 'receiver_name', 'method', 'status', 'transaction_code'], dateColumn: 'created_at', statusColumn: 'status' },
  'promotion-usage': { searchColumns: ['id', 'username', 'promotion_code', 'order_id'], dateColumn: 'used_at' },
  'loyalty-transactions': { searchColumns: ['id', 'username', 'full_name', 'transaction_type', 'reason', 'order_id'], dateColumn: 'created_at', statusColumn: 'transaction_type' },
  'activity-logs': { searchColumns: ['id', 'username', 'action', 'entity_type', 'entity_id', 'ip_address'], dateColumn: 'created_at' },
  banners: { searchColumns: ['id', 'title', 'image_url', 'target_link', 'placement'], dateColumn: 'created_at', statusColumn: 'placement' },
  stores: { searchColumns: ['id', 'name', 'address', 'district', 'city', 'phone', 'opening_hours', 'map_url'], dateColumn: 'created_at' },
  'news-posts': { searchColumns: ['id', 'title', 'slug', 'excerpt', 'content', 'post_type'], dateColumn: 'published_at', statusColumn: 'post_type' },
  'chat-sessions': { searchColumns: ['id', 'title', 'username', 'full_name'], dateColumn: 'started_at' },
  'chat-messages': { searchColumns: ['id', 'title', 'sender', 'message'], dateColumn: 'created_at', statusColumn: 'sender' }
};

const booleanFields = new Set([
  'is_active',
  'is_best_seller',
  'is_primary',
  'is_published',
  'recipe_required',
  'is_optional',
  'is_closed'
]);

module.exports = {
  resourceDefinitions,
  resourceFilterConfig,
  booleanFields
};
