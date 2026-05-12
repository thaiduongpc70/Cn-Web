const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

async function tokenRequired(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Thiếu Token xác thực!"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY || process.env.SECRET_KEY
        );

        const [rows] = await pool.query(
            `
            SELECT *
            FROM users
            WHERE user_id = ?
              AND is_deleted = FALSE
            LIMIT 1
            `,
            [decoded.user_id]
        );

        const currentUser = rows[0];

        if (!currentUser) {
            return res.status(401).json({
                message: "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa!"
            });
        }

        if (currentUser.status !== "active") {
            return res.status(401).json({
                message: "Tài khoản chưa được kích hoạt hoặc đã bị khóa!"
            });
        }

        req.user = currentUser;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Token không hợp lệ hoặc đã hết hạn!"
        });
    }
}

function adminRequired(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Bạn không có quyền truy cập khu vực quản trị!"
        });
    }

    next();
}

module.exports = {
    tokenRequired,
    adminRequired
};