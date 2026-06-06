import React from 'react';
import { dateTime, fieldLabel, isImageUrl, money, statusClass, truncate } from '../../../client/src/utils.js';

export const adminResourceGroups = [
  {
    title: 'Tổng quan',
    items: [['dashboard', '📈', 'Dashboard']]
  },
  {
    title: 'Sản phẩm & công thức',
    items: [
      ['products', '🍵', 'Sản phẩm'],
      ['categories', '▰', 'Danh mục'],
      ['product-images', '▧', 'Ảnh sản phẩm'],
      ['product-variants', '▤', 'Size / biến thể'],
      ['product-discounts', '%', 'Giảm giá món'],
      ['product-recipes', '☰', 'Công thức']
    ]
  },
  {
    title: 'Kho & nhập hàng',
    items: [
      ['suppliers', '▣', 'Nhà cung cấp'],
      ['materials', '▦', 'Nguyên liệu'],
      ['material-imports', '⇥', 'Phiếu nhập'],
      ['import-details', '≡', 'Chi tiết nhập'],
      ['material-batches', '▨', 'Lô nguyên liệu'],
      ['inventory-transactions', '↕', 'Giao dịch kho']
    ]
  },
  {
    title: 'Bán hàng',
    items: [
      ['orders', '▤', 'Đơn hàng'],
      ['order-details', '☷', 'Chi tiết đơn'],
      ['order-deliveries', '⇢', 'Giao hàng'],
      ['payments', '₫', 'Thanh toán'],
      ['carts', '🛒', 'Giỏ hàng'],
      ['cart-items', '▣', 'Sản phẩm giỏ']
    ]
  },
  {
    title: 'Khách hàng & hội viên',
    items: [
      ['users', '👥', 'Người dùng'],
      ['customer-profiles', '☷', 'Hồ sơ khách'],
      ['membership-tiers', '♛', 'Hạng hội viên'],
      ['member-gift-codes', '🎁', 'Mã quà'],
      ['loyalty-transactions', '★', 'Điểm hội viên']
    ]
  },
  {
    title: 'Marketing & nội dung',
    items: [
      ['promotions', '◇', 'Voucher'],
      ['promotion-usage', '✓', 'Lượt dùng mã'],
      ['banners', '▧', 'Banner'],
      ['news-posts', '▨', 'Tin tức'],
      ['stores', '⌖', 'Cửa hàng']
    ]
  },
  {
    title: 'Chat & hệ thống',
    items: [
      ['chat-sessions', '●', 'Phiên chat'],
      ['chat-messages', '✉', 'Tin nhắn chat'],
      ['drivers', '▣', 'Tài xế'],
      ['activity-logs', '↺', 'Nhật ký'],
      ['roles', '⚙', 'Vai trò']
    ]
  },
  {
    title: 'Thống kê',
    items: [
      ['revenue-daily-stats', '₫', 'Doanh thu ngày'],
      ['revenue-monthly-stats', '₫', 'Doanh thu tháng'],
      ['revenue-quarterly-stats', '₫', 'Doanh thu quý'],
      ['revenue-yearly-stats', '₫', 'Doanh thu năm'],
      ['invoice-daily-stats', '▤', 'Hóa đơn ngày'],
      ['invoice-monthly-stats', '▤', 'Hóa đơn tháng'],
      ['invoice-quarterly-stats', '▤', 'Hóa đơn quý'],
      ['invoice-yearly-stats', '▤', 'Hóa đơn năm']
    ]
  }
];

export const adminResources = adminResourceGroups.flatMap((group) => group.items);

export const hiddenCreateFields = new Set(['password_hash']);
const moneyFields = new Set([
  'price',
  'total_amount',
  'subtotal',
  'discount_amount',
  'amount',
  'unit_price',
  'discount_value',
  'minimum_order_amount',
  'gift_value',
  'birthday_reward_amount',
  'free_shipping_min_order',
  'last_import_price',
  'average_cost',
  'stock_value',
  'base_cost',
  'paid_amount',
  'gross_revenue',
  'net_revenue',
  'average_order_value',
  'unit_cost',
  'original_price',
  'sale_price'
]);
const dateFields = new Set([
  'created_at',
  'updated_at',
  'start_date',
  'end_date',
  'starts_at',
  'ends_at',
  'published_at',
  'import_date',
  'paid_at',
  'delivered_at',
  'estimated_arrival',
  'used_at',
  'started_at',
  'ended_at',
  'expected_date',
  'manufacturing_date',
  'expiry_date',
  'received_at',
  'stat_date'
]);
export const booleanFields = new Set(['is_active', 'is_best_seller', 'is_primary', 'is_published', 'recipe_required', 'is_optional', 'is_closed']);
export const enumOptions = {
  membership_rank: ['Silver', 'Gold', 'VIP'],
  rank_name: ['Silver', 'Gold', 'VIP'],
  required_membership_rank: ['', 'Silver', 'Gold', 'VIP'],
  discount_type: ['Percent', 'Fixed_Amount'],
  gift_type: ['Voucher', 'Topping', 'Drink', 'Shipping'],
  status: ['Pending', 'Paid', 'Preparing', 'Completed', 'Cancelled', 'Refunded'],
  recipe_status: ['Draft', 'Ready', 'Missing'],
  material_type: ['Tea_Base', 'Milk_Base', 'Sweetener', 'Topping', 'Fruit', 'Powder', 'Cream', 'Packaging', 'Other'],
  method: ['Cash', 'Card', 'Momo', 'VNPay'],
  transaction_type: ['earn', 'redeem', 'refund'],
  reference_type: ['material_imports', 'orders', 'manual'],
  placement: ['home', 'cart', 'all'],
  post_type: ['News', 'Promotion', 'Guide'],
  sender: ['user', 'assistant', 'system']
};
export const resourceEnumOptions = {
  'product-discounts': {
    scope: ['Product', 'Category'],
    discount_type: ['Percent', 'Fixed_Amount']
  },
  orders: {
    status: ['Pending', 'Paid', 'Preparing', 'Completed', 'Cancelled', 'Refunded']
  },
  'order-deliveries': {
    status: ['Assigned', 'Picked_Up', 'Delivering', 'Delivered', 'Failed']
  },
  payments: {
    status: ['Pending', 'Paid', 'Failed', 'Refunded']
  },
  'material-imports': {
    status: ['Draft', 'Received', 'Cancelled']
  },
  'inventory-transactions': {
    transaction_type: ['Import', 'Order_Usage', 'Adjustment_In', 'Adjustment_Out', 'Waste', 'Return'],
    reference_type: ['material_imports', 'orders', 'manual']
  }
};

export const defaultResourceFilters = {
  q: '',
  from: '',
  to: '',
  status: ''
};

export function renderAdminCell(key, value, row) {
  if (value === null || value === undefined) return <span className="muted">-</span>;
  if (key === 'status' || key.endsWith('_status')) return <span className={statusClass(value)}>{value}</span>;
  if (booleanFields.has(key)) return value ? <span className="badge badge-green">Bật</span> : <span className="badge badge-gray">Tắt</span>;
  if (key === 'discount_value' && row.discount_type === 'Percent') return `${Number(value)}%`;
  if (moneyFields.has(key)) return money(value);
  if (dateFields.has(key)) return dateTime(value);
  if (isImageUrl(value)) return <img src={value} alt="" style={{ width: 76, height: 52, objectFit: 'cover', borderRadius: 8 }} />;
  if (String(value).length > 90) return truncate(value, 90);
  return String(value);
}

export function fieldInitialValue(field) {
  if (booleanFields.has(field)) return '1';
  if (field === 'scope') return 'Product';
  if (field === 'discount_type') return 'Percent';
  if (field === 'priority') return '1';
  if (field.includes('date') || field.endsWith('_at')) return '';
  return '';
}

export function fieldInputPlaceholder(field) {
  if (field === 'image_url') return 'Dán nguồn ảnh, ví dụ: https://...jpg';
  return '';
}
