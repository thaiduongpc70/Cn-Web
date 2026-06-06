const express = require('express');
const shopController = require('../../controllers/client');
const chatController = require('../../controllers/client/chat.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/home', shopController.home);
router.get('/categories', shopController.categories);
router.get('/products', shopController.products);
router.get('/products/:id', shopController.productDetail);
router.get('/promotions', shopController.promotions);
router.get('/news', shopController.news);
router.get('/news/:slug', shopController.newsDetail);
router.get('/stores', shopController.stores);

router.post('/chat', chatController.start);
router.get('/chat', chatController.list);
router.get('/chat/:sessionId/messages', chatController.messages);
router.post('/chat/:sessionId/messages', chatController.send);

router.use(requireAuth);

router.get('/cart', shopController.cart);
router.post('/cart/items', shopController.addCartItem);
router.put('/cart/items/:id', shopController.updateCartItem);
router.delete('/cart/items/:id', shopController.removeCartItem);
router.post('/cart/apply-promotion', shopController.applyPromotion);
router.post('/checkout', shopController.checkout);
router.get('/orders', shopController.myOrders);
router.get('/orders/:id', shopController.orderDetail);
router.get('/profile', shopController.profile);
router.put('/profile', shopController.updateProfile);

module.exports = router;
