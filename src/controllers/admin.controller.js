const { pool } = require("../config/db");

async function callProcedure(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return Array.isArray(rows[0]) ? rows[0] : rows;
}

async function dashboard(req, res) {
    try {
        const rows = await callProcedure("CALL sp_AdminDashboardStats()");
        return res.json({ status: "success", data: rows[0] || {} });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi lấy dashboard admin: ${error.message}` });
    }
}

async function getUsers(req, res) {
    try {
        const { role = null, status = null, keyword = null } = req.query;
        const rows = await callProcedure("CALL sp_AdminGetUsers(?, ?, ?)", [role, status, keyword]);
        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi lấy danh sách người dùng: ${error.message}` });
    }
}

async function getPredictions(req, res) {
    try {
        const userId = req.query.user_id || null;
        const modelId = req.query.model_id || null;
        const dateFrom = req.query.date_from || null;
        const dateTo = req.query.date_to || null;

        const rows = await callProcedure("CALL sp_AdminGetPredictions(?, ?, ?, ?)", [
            userId,
            modelId,
            dateFrom,
            dateTo
        ]);

        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi lấy danh sách dự đoán: ${error.message}` });
    }
}

async function deletePrediction(req, res) {
    try {
        const reason = req.body?.reason || "Admin xóa kết quả dự đoán";

        await pool.query("CALL sp_AdminDeletePrediction(?, ?, ?)", [
            req.user.user_id,
            req.params.prediction_id,
            reason
        ]);

        return res.json({ status: "success", message: "Đã xóa kết quả dự đoán." });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi xóa dự đoán: ${error.message}` });
    }
}

async function deleteAllPredictions(req, res) {
    try {
        const { confirm, reason = "Admin xóa toàn bộ lịch sử dự đoán" } = req.body || {};

        if (confirm !== "DELETE") {
            return res.status(400).json({
                message: "Vui lòng nhập confirm = DELETE để xác nhận xóa toàn bộ."
            });
        }

        await pool.query("CALL sp_AdminDeleteAllPredictions(?, ?)", [
            req.user.user_id,
            reason
        ]);

        return res.json({ status: "success", message: "Đã xóa toàn bộ lịch sử dự đoán." });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi xóa toàn bộ dự đoán: ${error.message}` });
    }
}

async function statsByModel(req, res) {
    try {
        const rows = await callProcedure("CALL sp_AdminStatsByModel()");
        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi thống kê theo model: ${error.message}` });
    }
}

async function statsByDate(req, res) {
    try {
        const rows = await callProcedure("CALL sp_AdminStatsByDate(?, ?)", [
            req.query.date_from || null,
            req.query.date_to || null
        ]);

        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi thống kê theo ngày: ${error.message}` });
    }
}

async function statsByRegion(req, res) {
    try {
        const rows = await callProcedure("CALL sp_AdminStatsByRegion()");
        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi thống kê theo vùng: ${error.message}` });
    }
}

async function updateUserStatus(req, res) {
    try {
        const { status, reason = "Admin cập nhật trạng thái tài khoản" } = req.body || {};

        if (!["active", "disabled", "pending"].includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ." });
        }

        await pool.query("CALL sp_AdminUpdateUserStatus(?, ?, ?, ?)", [
            req.user.user_id,
            req.params.user_id,
            status,
            reason
        ]);

        return res.json({ status: "success", message: "Đã cập nhật trạng thái user." });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi cập nhật trạng thái user: ${error.message}` });
    }
}

async function updateUserRole(req, res) {
    try {
        const { role, reason = "Admin cập nhật quyền tài khoản" } = req.body || {};

        if (!["admin", "staff", "member"].includes(role)) {
            return res.status(400).json({ message: "Role không hợp lệ." });
        }

        await pool.query("CALL sp_AdminUpdateUserRole(?, ?, ?, ?)", [
            req.user.user_id,
            req.params.user_id,
            role,
            reason
        ]);

        return res.json({ status: "success", message: "Đã cập nhật quyền user." });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi cập nhật quyền user: ${error.message}` });
    }
}

async function activityLogs(req, res) {
    try {
        const rows = await callProcedure("CALL sp_AdminGetActivityLogs(?, ?, ?)", [
            req.query.user_id || null,
            req.query.date_from || null,
            req.query.date_to || null
        ]);

        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi lấy activity logs: ${error.message}` });
    }
}

async function adminActions(req, res) {
    try {
        const rows = await callProcedure("CALL sp_AdminGetAdminActions(?, ?, ?, ?)", [
            req.query.admin_id || null,
            req.query.target_table || null,
            req.query.date_from || null,
            req.query.date_to || null
        ]);

        return res.json({ status: "success", data: rows });
    } catch (error) {
        return res.status(500).json({ message: `Lỗi khi lấy admin actions: ${error.message}` });
    }
}

module.exports = {
    dashboard,
    getUsers,
    getPredictions,
    deletePrediction,
    deleteAllPredictions,
    statsByModel,
    statsByDate,
    statsByRegion,
    updateUserStatus,
    updateUserRole,
    activityLogs,
    adminActions
};