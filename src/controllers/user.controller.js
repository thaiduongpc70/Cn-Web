const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

async function getProfile(req, res) {
    try {
        const [rows] = await pool.query(
            `
            SELECT profile_data
            FROM user_profiles
            WHERE user_id = ?
            LIMIT 1
            `,
            [req.user.user_id]
        );

        return res.json({
            status: "success",
            profile: rows[0]?.profile_data || null
        });
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi lấy hồ sơ: ${error.message}`
        });
    }
}

async function saveProfile(req, res) {
    try {
        const data = req.body || {};

        const [rows] = await pool.query(
            `
            SELECT profile_id
            FROM user_profiles
            WHERE user_id = ?
            LIMIT 1
            `,
            [req.user.user_id]
        );

        if (rows.length === 0) {
            await pool.query(
                `
                INSERT INTO user_profiles (user_id, profile_data, updated_at)
                VALUES (?, ?, NOW())
                `,
                [req.user.user_id, JSON.stringify(data)]
            );
        } else {
            await pool.query(
                `
                UPDATE user_profiles
                SET profile_data = ?,
                    updated_at = NOW()
                WHERE user_id = ?
                `,
                [JSON.stringify(data), req.user.user_id]
            );
        }

        return res.json({
            status: "success",
            message: "Đã lưu hồ sơ y tế!"
        });
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi lưu hồ sơ: ${error.message}`
        });
    }
}

async function changePassword(req, res) {
    try {
        const { old_password, new_password } = req.body || {};

        if (!old_password || !new_password) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!"
            });
        }

        const passwordOk = await bcrypt.compare(
            old_password,
            req.user.password_hash
        );

        if (!passwordOk) {
            return res.status(401).json({
                message: "Mật khẩu hiện tại không chính xác!"
            });
        }

        const newHash = await bcrypt.hash(new_password, 10);

        await pool.query(
            `
            UPDATE users
            SET password_hash = ?
            WHERE user_id = ?
            `,
            [newHash, req.user.user_id]
        );

        return res.json({
            status: "success",
            message: "Đổi mật khẩu thành công!"
        });
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi đổi mật khẩu: ${error.message}`
        });
    }
}

module.exports = {
    getProfile,
    saveProfile,
    changePassword
};