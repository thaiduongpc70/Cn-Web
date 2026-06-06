const { query } = require('../config/db');

async function attachUser(req, res, next) {
  try {
    if (!req.session.user) {
      res.locals.currentUser = null;
      return next();
    }

    const users = await query(
      `SELECT u.id, u.username, u.is_active, r.name AS role_name,
              cp.full_name, cp.email, cp.phone, cp.address,
              cp.loyalty_points, cp.membership_rank
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN customer_profiles cp ON cp.user_id = u.id
       WHERE u.id = ?`,
      [req.session.user.id]
    );

    if (!users.length || !users[0].is_active) {
      req.session.destroy(() => {});
      res.locals.currentUser = null;
      return next();
    }

    req.user = users[0];
    req.session.user = {
      id: users[0].id,
      username: users[0].username,
      role_name: users[0].role_name
    };
    res.locals.currentUser = req.user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role_name !== 'Admin') {
    return res.status(403).json({ message: 'Chỉ tài khoản admin được truy cập.' });
  }

  next();
}

function requireClient(req, res, next) {
  if (!req.user || req.user.role_name !== 'Client') {
    return res.status(403).json({ message: 'Chỉ tài khoản client được truy cập.' });
  }

  next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
  requireClient
};
