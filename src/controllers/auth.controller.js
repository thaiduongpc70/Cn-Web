const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

function createAccessToken(userId) {
    return jwt.sign(
        { user_id: userId },
        process.env.JWT_SECRET_KEY || process.env.SECRET_KEY,
        { expiresIn: "24h" }
    );
}

async function register(req, res) {
    try {
        const { username, email, password } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Vui lòng điền đầy đủ thông tin đăng ký!"
            });
        }

        const [existing] = await pool.query(
            `
            SELECT user_id
            FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
            `,
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Tên đăng nhập hoặc Email đã được sử dụng!"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `
            INSERT INTO users (
                username,
                email,
                password_hash,
                role,
                status
            )
            VALUES (?, ?, ?, 'member', 'active')
            `,
            [username, email, passwordHash]
        );

        const token = createAccessToken(result.insertId);

        return res.status(201).json({
            status: "success",
            message: "Tạo tài khoản thành công!",
            token,
            user: {
                username,
                role: "member"
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi đăng ký: ${error.message}`
        });
    }
}

async function login(req, res) {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({
                message: "Thiếu tên đăng nhập hoặc mật khẩu!"
            });
        }

        const [rows] = await pool.query(
            `
            SELECT *
            FROM users
            WHERE username = ?
              AND is_deleted = FALSE
            LIMIT 1
            `,
            [username]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                message: "Tên đăng nhập hoặc mật khẩu không chính xác!"
            });
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);

        if (!passwordOk) {
            await pool.query(
                `
                UPDATE users
                SET failed_attempts = COALESCE(failed_attempts, 0) + 1
                WHERE user_id = ?
                `,
                [user.user_id]
            );

            return res.status(401).json({
                message: "Tên đăng nhập hoặc mật khẩu không chính xác!"
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                message: "Tài khoản chưa được kích hoạt hoặc đã bị khóa!"
            });
        }

        await pool.query(
            `
            UPDATE users
            SET last_login = NOW(),
                failed_attempts = 0
            WHERE user_id = ?
            `,
            [user.user_id]
        );

        const token = createAccessToken(user.user_id);

        return res.json({
            status: "success",
            token,
            user: {
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi đăng nhập: ${error.message}`
        });
    }
}

async function getMe(req, res) {
    const user = req.user;

    return res.json({
        status: "success",
        user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        }
    });
}

module.exports = {
    register,
    login,
    getMe
};