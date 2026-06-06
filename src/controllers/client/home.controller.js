const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { BEST_SELLER_LIMIT, getProductRows, formatProductRows } = require('./shop.helpers');

const home = asyncHandler(async (req, res) => {
  const [banners, categories, bestSellers, news, stores] = await Promise.all([
    query(
      `SELECT *
       FROM banners
       WHERE is_active = TRUE
         AND placement IN ('home', 'all')
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at >= NOW())
       ORDER BY display_order ASC, id DESC`
    ),
    query('SELECT * FROM categories ORDER BY id ASC'),
    getProductRows('AND best_rank.id IS NOT NULL'),
    query(
      `SELECT id, title, slug, excerpt, image_url, post_type, published_at
       FROM news_posts
       WHERE is_published = TRUE
       ORDER BY published_at DESC
       LIMIT 3`
    ),
    query('SELECT * FROM stores WHERE is_active = TRUE ORDER BY display_order ASC LIMIT 3')
  ]);

  res.json({
    banners,
    categories,
    best_sellers: formatProductRows(bestSellers).slice(0, BEST_SELLER_LIMIT),
    news,
    stores
  });
});

const categories = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT c.*, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
     GROUP BY c.id
     ORDER BY c.id ASC`
  );

  res.json({ data: rows });
});

const promotions = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT *
     FROM promotions
     WHERE is_active = TRUE
       AND NOW() BETWEEN start_date AND end_date
       AND (
         required_membership_rank IS NULL
         OR required_membership_rank = ?
         OR (required_membership_rank = 'Gold' AND ? = 'VIP')
       )
     ORDER BY minimum_order_amount ASC, end_date ASC`,
    [req.user?.membership_rank || 'Silver', req.user?.membership_rank || 'Silver']
  );

  res.json({ data: rows });
});

const news = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, title, slug, excerpt, content, image_url, post_type, published_at
     FROM news_posts
     WHERE is_published = TRUE
     ORDER BY published_at DESC`
  );

  res.json({ data: rows });
});

const newsDetail = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT *
     FROM news_posts
     WHERE slug = ? AND is_published = TRUE
     LIMIT 1`,
    [req.params.slug]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
  }

  res.json({ data: rows[0] });
});

const stores = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM stores WHERE is_active = TRUE ORDER BY display_order ASC, id DESC');
  res.json({ data: rows });
});

module.exports = {
  home,
  categories,
  promotions,
  news,
  newsDetail,
  stores
};
