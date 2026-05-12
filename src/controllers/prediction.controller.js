const { pool } = require("../config/db");
const predictionService = require("../services/prediction.service");

function safeInt(value, defaultValue = null) {
    const number = parseInt(value, 10);

    if (Number.isNaN(number)) {
        return defaultValue;
    }

    return number;
}

function safeFloat(value, defaultValue = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return defaultValue;
    }

    return number;
}

async function predictAndSave(req, res) {
    const connection = await pool.getConnection();

    try {
        const data = req.body || {};

        let modelType = String(data.model_type || "basic").trim().toLowerCase();

        if (!["basic", "advanced"].includes(modelType)) {
            modelType = "basic";
        }

        data.model_type = modelType;

        const modelId = modelType === "basic" ? 1 : 2;

        const predictionResult = await predictionService.makePrediction(data);

        const predictedCost = safeFloat(predictionResult.predicted_cost, 0);

        const bmi = predictionService.calculateBmi(
            data.height_cm,
            data.weight_kg
        );

        let stressId = safeInt(data.stress_id, null);

        if (modelId === 1) {
            stressId = null;
        }

        if (modelId === 2 && stressId === null) {
            stressId = 1;
        }

        await connection.query(
            `
            CALL sp_InsertPrediction_V2(
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                @new_id
            )
            `,
            [
                req.user.user_id,
                modelId,
                safeInt(data.age, 30),
                safeInt(data.gender_id, 1),
                safeInt(data.region_id, 1),
                stressId,
                bmi,
                safeFloat(data.annual_income, 0),
                data.substance_use || "None",
                data.exercise_frequency || "None",
                JSON.stringify(data),
                predictedCost
            ]
        );

        connection.release();

        return res.json({
            status: "success",
            model_type: modelType,
            model_id: modelId,
            predicted_cost: predictedCost,
            bmi,
            top_features: predictionResult.top_features || [],
            model_explanation: predictionResult.model_explanation || null,
            message: "Dự đoán thành công và lịch sử đã được lưu."
        });
    } catch (error) {
        connection.release();

        return res.status(500).json({
            message: `Lỗi hệ thống: ${error.message}`
        });
    }
}

async function getUserHistory(req, res) {
    try {
        const [rows] = await pool.query(
            `
            SELECT
                prediction_id AS id,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS date,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS datetime_display,
                CASE
                    WHEN model_id = 1 THEN 'Cơ bản (Basic)'
                    ELSE 'Chuyên sâu (Advanced)'
                END AS model,
                age,
                bmi,
                annual_income AS income,
                predicted_cost AS cost
            FROM predictions
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [req.user.user_id]
        );

        return res.json(rows);
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi lấy lịch sử: ${error.message}`
        });
    }
}

async function getPredictionDetail(req, res) {
    try {
        const predictionId = req.params.prediction_id;

        const [rows] = await pool.query(
            `
            SELECT *
            FROM predictions
            WHERE prediction_id = ?
              AND user_id = ?
            LIMIT 1
            `,
            [predictionId, req.user.user_id]
        );

        const prediction = rows[0];

        if (!prediction) {
            return res.status(404).json({
                message: "Không tìm thấy kết quả dự đoán!"
            });
        }

        return res.json({
            status: "success",
            prediction: {
                id: prediction.prediction_id,
                model_id: prediction.model_id,
                model:
                    prediction.model_id === 1
                        ? "Cơ bản (Basic)"
                        : "Chuyên sâu (Advanced)",
                age: prediction.age,
                gender_id: prediction.gender_id,
                region_id: prediction.region_id,
                stress_id: prediction.stress_id,
                bmi: Number(prediction.bmi || 0),
                annual_income: Number(prediction.annual_income || 0),
                substance_use: prediction.substance_use,
                exercise_frequency: prediction.exercise_frequency,
                predicted_cost: Number(prediction.predicted_cost || 0),
                input_values:
                    typeof prediction.input_values === "string"
                        ? JSON.parse(prediction.input_values || "{}")
                        : prediction.input_values || {},
                created_at: prediction.created_at
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: `Lỗi khi lấy chi tiết dự đoán: ${error.message}`
        });
    }
}

module.exports = {
    predictAndSave,
    getUserHistory,
    getPredictionDetail
};