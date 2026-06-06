const { query, transaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword } = require('../utils/password');

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user || null });
});

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const users = await query(
    `SELECT u.id, u.username, u.password_hash, u.is_active, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.username = ?`,
    [username]
  );

  if (!users.length || users[0].password_hash !== hashPassword(password) || !users[0].is_active) {
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  }

  req.session.user = {
    id: users[0].id,
    username: users[0].username,
    role_name: users[0].role_name
  };

  res.json({
    user: {
      id: users[0].id,
      username: users[0].username,
      role_name: users[0].role_name
    }
  });
});

const register = asyncHandler(async (req, res) => {
  const { username, password, full_name, email, phone, address } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập, mật khẩu và họ tên.' });
  }

  const result = await transaction(async (connection) => {
    const [roles] = await connection.query('SELECT id FROM roles WHERE name = ? LIMIT 1', ['Client']);
    if (!roles.length) {
      throw new Error('Database chưa có role Client.');
    }

    const [userResult] = await connection.query(
      'INSERT INTO users(role_id, username, password_hash, is_active) VALUES (?, ?, ?, TRUE)',
      [roles[0].id, username, hashPassword(password)]
    );

    await connection.query(
      `INSERT INTO customer_profiles(user_id, full_name, email, phone, address)
       VALUES (?, ?, ?, ?, ?)`,
      [userResult.insertId, full_name, email || null, phone || null, address || null]
    );

    await connection.query('INSERT INTO carts(user_id) VALUES (?)', [userResult.insertId]);

    return {
      id: userResult.insertId,
      username,
      role_name: 'Client'
    };
  });

  req.session.user = result;
  res.status(201).json({ user: result });
});

const logout = asyncHandler(async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('bantrasua.sid');
    res.json({ message: 'Đã đăng xuất.' });
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới cần ít nhất 6 ký tự.' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
  }

  const users = await query('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
  if (!users.length || users[0].password_hash !== hashPassword(current_password)) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
  }

  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(new_password), req.user.id]);
  res.json({ message: 'Đã đổi mật khẩu.' });
});

module.exports = {
  me,
  login,
  register,
  logout,
  changePassword
};
