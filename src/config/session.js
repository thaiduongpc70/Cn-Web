const session = require('express-session');

module.exports = session({
    secret: process.env.SESSION_SECRET || 'secret_key_123', // Đảm bảo trong .env có SESSION_SECRET
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Để true nếu bạn dùng HTTPS
        maxAge: 1000 * 60 * 60 * 24 // Session tồn tại 24 giờ
    }
});