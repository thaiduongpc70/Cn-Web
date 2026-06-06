const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/me', authController.me);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/change-password', requireAuth, authController.changePassword);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
