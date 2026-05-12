CREATE DATABASE IF NOT EXISTS healthcare_prediction;
USE healthcare_prediction;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS vw_admin_prediction_summary;
DROP VIEW IF EXISTS vw_dashboard_cost_analysis;

DROP TRIGGER IF EXISTS trg_AfterPredictionInsert;
DROP TRIGGER IF EXISTS trg_UpdateModelAccuracy;

DROP PROCEDURE IF EXISTS sp_GetFeaturesByModel;
DROP PROCEDURE IF EXISTS sp_SavePrediction;
DROP PROCEDURE IF EXISTS sp_InsertPrediction_V2;
DROP PROCEDURE IF EXISTS sp_SaveUserProfile;
DROP PROCEDURE IF EXISTS sp_LogAdminAction;
DROP PROCEDURE IF EXISTS sp_AdminGetPredictions;
DROP PROCEDURE IF EXISTS sp_AdminDashboardStats;
DROP PROCEDURE IF EXISTS sp_AdminStatsByModel;
DROP PROCEDURE IF EXISTS sp_AdminStatsByDate;
DROP PROCEDURE IF EXISTS sp_AdminStatsByRegion;
DROP PROCEDURE IF EXISTS sp_AdminDeletePrediction;
DROP PROCEDURE IF EXISTS sp_AdminDeleteAllPredictions;
DROP PROCEDURE IF EXISTS sp_AdminUpdateUserStatus;
DROP PROCEDURE IF EXISTS sp_AdminUpdateUserRole;
DROP PROCEDURE IF EXISTS sp_AdminGetUsers;
DROP PROCEDURE IF EXISTS sp_AdminGetActivityLogs;
DROP PROCEDURE IF EXISTS sp_AdminGetAdminActions;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','staff','member') DEFAULT 'member',
    status ENUM('active','disabled','pending') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    failed_attempts INT DEFAULT 0,
    last_login DATETIME NULL,
    refresh_token TEXT NULL,
    password_reset_token VARCHAR(255) NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_actions (
    admin_action_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id INT NULL,
    action_type VARCHAR(50) NOT NULL,
    old_data JSON NULL,
    new_data JSON NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS models (
    model_id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    model_type VARCHAR(50),
    model_path VARCHAR(255),
    dataset_version VARCHAR(50),
    accuracy_score DECIMAL(15,2) DEFAULT 0.00,
    trained_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO models (
    model_id,
    model_name,
    model_version,
    model_type,
    model_path,
    dataset_version,
    accuracy_score,
    trained_at
) VALUES
(1, 'Medical Cost Basic Model', 'v1', 'basic', 'models/medical_model_v1.pkl', 'v1', 0.00, CURRENT_TIMESTAMP),
(2, 'Medical Cost Advanced Model', 'v2', 'advanced', 'models/medical_model_v2.pkl', 'v2', 0.00, CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS features (
    feature_id INT AUTO_INCREMENT PRIMARY KEY,
    feature_code VARCHAR(100) UNIQUE,
    display_name VARCHAR(255),
    data_type VARCHAR(50),
    description TEXT
);

CREATE TABLE IF NOT EXISTS model_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT,
    feature_id INT,
    FOREIGN KEY (model_id) REFERENCES models(model_id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES features(feature_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genders (
    gender_id INT AUTO_INCREMENT PRIMARY KEY,
    gender_name VARCHAR(20) UNIQUE
);

INSERT IGNORE INTO genders (gender_id, gender_name) VALUES
(1, 'male'),
(2, 'female'),
(3, 'other');

CREATE TABLE IF NOT EXISTS blood_types (
    blood_id INT AUTO_INCREMENT PRIMARY KEY,
    blood_name VARCHAR(5) UNIQUE
);

INSERT IGNORE INTO blood_types (blood_id, blood_name) VALUES
(1, 'A'),
(2, 'B'),
(3, 'AB'),
(4, 'O');

CREATE TABLE IF NOT EXISTS stress_levels (
    stress_id INT AUTO_INCREMENT PRIMARY KEY,
    level_name VARCHAR(50) UNIQUE
);

INSERT IGNORE INTO stress_levels (stress_id, level_name) VALUES
(1, 'Very Low'),
(2, 'Low'),
(3, 'Mild'),
(4, 'Moderate Low'),
(5, 'Moderate'),
(6, 'Moderate High'),
(7, 'High'),
(8, 'Very High'),
(9, 'Severe'),
(10, 'Extreme');

CREATE TABLE IF NOT EXISTS regions (
    region_id INT AUTO_INCREMENT PRIMARY KEY,
    region_name VARCHAR(100) UNIQUE
);

INSERT IGNORE INTO regions (region_id, region_name) VALUES
(1, 'Ha Noi'),
(2, 'Ho Chi Minh'),
(3, 'Da Nang'),
(4, 'Hai Phong'),
(5, 'Can Tho'),
(6, 'An Giang'),
(7, 'Ba Ria - Vung Tau'),
(8, 'Bac Giang'),
(9, 'Bac Ninh'),
(10, 'Ben Tre'),
(11, 'Binh Duong'),
(12, 'Binh Dinh'),
(13, 'Binh Phuoc'),
(14, 'Binh Thuan'),
(15, 'Ca Mau'),
(16, 'Cao Bang'),
(17, 'Dak Lak'),
(18, 'Dak Nong'),
(19, 'Dien Bien'),
(20, 'Dong Nai'),
(21, 'Dong Thap'),
(22, 'Gia Lai'),
(23, 'Ha Giang'),
(24, 'Ha Nam'),
(25, 'Ha Tinh'),
(26, 'Hai Duong'),
(27, 'Hau Giang'),
(28, 'Hoa Binh');

CREATE TABLE IF NOT EXISTS conditions (
    condition_id INT AUTO_INCREMENT PRIMARY KEY,
    condition_name VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS medications (
    medication_id INT AUTO_INCREMENT PRIMARY KEY,
    medication_name VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS allergies (
    allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    allergy_name VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS medical_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    age INT CHECK (age BETWEEN 0 AND 120),
    gender_id INT,
    height_cm DECIMAL(5,2) CHECK (height_cm BETWEEN 40 AND 260),
    weight_kg DECIMAL(5,2) CHECK (weight_kg BETWEEN 2 AND 300),
    bmi DECIMAL(5,2) AS (weight_kg / ((height_cm / 100) * (height_cm / 100))) VIRTUAL,
    blood_id INT,
    substance_use ENUM('None', 'Smoker', 'Alcohol', 'Both') DEFAULT 'None',
    children INT CHECK (children >= 0),
    region_id INT,
    annual_income DECIMAL(15,2),
    heart_rate INT CHECK (heart_rate BETWEEN 30 AND 220),
    avg_body_temperature DECIMAL(4,2) CHECK (avg_body_temperature BETWEEN 30 AND 45),
    blood_sugar_level DECIMAL(5,2),
    ethnicity VARCHAR(100),
    education_level VARCHAR(100),
    stress_id INT,
    dietary_habits VARCHAR(100),
    exercise_frequency VARCHAR(100),
    reproductive_history TEXT,
    charges DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gender_id) REFERENCES genders(gender_id),
    FOREIGN KEY (blood_id) REFERENCES blood_types(blood_id),
    FOREIGN KEY (stress_id) REFERENCES stress_levels(stress_id),
    FOREIGN KEY (region_id) REFERENCES regions(region_id)
);

CREATE TABLE IF NOT EXISTS record_conditions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT,
    condition_id INT,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES conditions(condition_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record_medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT,
    medication_id INT,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (medication_id) REFERENCES medications(medication_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record_allergies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT,
    allergy_id INT,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (allergy_id) REFERENCES allergies(allergy_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    model_id INT NULL,
    age INT,
    gender_id INT,
    region_id INT NULL,
    stress_id INT NULL,
    bmi DECIMAL(5,2),
    annual_income DECIMAL(15,2),
    substance_use VARCHAR(50),
    exercise_frequency VARCHAR(50),
    input_values JSON,
    predicted_cost DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (model_id) REFERENCES models(model_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_id INT,
    actual_cost DECIMAL(15,2),
    user_rating INT CHECK (user_rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prediction_id) REFERENCES predictions(prediction_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    profile_data JSON NULL,
    age INT NULL,
    gender_id INT NULL,
    ethnicity VARCHAR(50) NULL,
    children INT DEFAULT 0,
    region_id INT NULL,
    annual_income DECIMAL(15,2) NULL,
    health_insurance ENUM('yes', 'no') NULL,
    education_level VARCHAR(100) NULL,
    height_cm DECIMAL(5,2) NULL,
    weight_kg DECIMAL(5,2) NULL,
    blood_id INT NULL,
    heart_rate INT NULL,
    avg_body_temperature DECIMAL(4,2) NULL,
    blood_sugar_level DECIMAL(5,2) NULL,
    allergies VARCHAR(255) NULL,
    underlying_conditions VARCHAR(255) NULL,
    genetic_diseases VARCHAR(255) NULL,
    reproductive_history INT NULL,
    current_medications VARCHAR(255) NULL,
    medication_history VARCHAR(255) NULL,
    substance_use VARCHAR(50) NULL,
    dietary_habits VARCHAR(50) NULL,
    exercise_frequency VARCHAR(50) NULL,
    stress_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_table, target_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);
CREATE INDEX idx_medical_age ON medical_records(age);
CREATE INDEX idx_medical_income ON medical_records(annual_income);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_model ON predictions(model_id);
CREATE INDEX idx_predictions_region ON predictions(region_id);
CREATE INDEX idx_predictions_date ON predictions(created_at);
CREATE INDEX idx_predictions_cost ON predictions(predicted_cost);

DELIMITER //

CREATE PROCEDURE sp_GetFeaturesByModel(IN p_model_id INT)
BEGIN
    SELECT f.feature_code, f.display_name, f.data_type
    FROM features f
    JOIN model_features mf ON f.feature_id = mf.feature_id
    WHERE mf.model_id = p_model_id;
END //

CREATE PROCEDURE sp_SavePrediction(
    IN p_user_id INT,
    IN p_model_id INT,
    IN p_age INT,
    IN p_gender_id INT,
    IN p_bmi DECIMAL(5,2),
    IN p_json_data JSON,
    IN p_predicted_cost DECIMAL(15,2),
    OUT p_new_id INT
)
BEGIN
    INSERT INTO predictions (user_id, model_id, age, gender_id, bmi, input_values, predicted_cost)
    VALUES (p_user_id, p_model_id, p_age, p_gender_id, p_bmi, p_json_data, p_predicted_cost);

    SET p_new_id = LAST_INSERT_ID();
END //

CREATE PROCEDURE sp_InsertPrediction_V2(
    IN p_user_id INT,
    IN p_model_id INT,
    IN p_age INT,
    IN p_gender_id INT,
    IN p_region_id INT,
    IN p_stress_id INT,
    IN p_bmi DECIMAL(5,2),
    IN p_income DECIMAL(15,2),
    IN p_substance VARCHAR(50),
    IN p_exercise VARCHAR(50),
    IN p_json_data JSON,
    IN p_predicted_cost DECIMAL(15,2),
    OUT p_new_id INT
)
BEGIN
    INSERT INTO predictions (
        user_id,
        model_id,
        age,
        gender_id,
        region_id,
        stress_id,
        bmi,
        annual_income,
        substance_use,
        exercise_frequency,
        input_values,
        predicted_cost
    ) VALUES (
        p_user_id,
        p_model_id,
        p_age,
        p_gender_id,
        p_region_id,
        p_stress_id,
        p_bmi,
        p_income,
        p_substance,
        p_exercise,
        p_json_data,
        p_predicted_cost
    );

    SET p_new_id = LAST_INSERT_ID();
END //

CREATE PROCEDURE sp_SaveUserProfile(
    IN p_user_id INT,
    IN p_age INT,
    IN p_gender_id INT,
    IN p_ethnicity VARCHAR(50),
    IN p_children INT,
    IN p_region_id INT,
    IN p_annual_income DECIMAL(15,2),
    IN p_health_insurance VARCHAR(10),
    IN p_education_level VARCHAR(100),
    IN p_height_cm DECIMAL(5,2),
    IN p_weight_kg DECIMAL(5,2),
    IN p_blood_id INT,
    IN p_heart_rate INT,
    IN p_avg_body_temperature DECIMAL(4,2),
    IN p_blood_sugar_level DECIMAL(5,2),
    IN p_allergies VARCHAR(255),
    IN p_underlying_conditions VARCHAR(255),
    IN p_genetic_diseases VARCHAR(255),
    IN p_reproductive_history INT,
    IN p_current_medications VARCHAR(255),
    IN p_medication_history VARCHAR(255),
    IN p_substance_use VARCHAR(50),
    IN p_dietary_habits VARCHAR(50),
    IN p_exercise_frequency VARCHAR(50),
    IN p_stress_id INT
)
BEGIN
    INSERT INTO user_profiles (
        user_id,
        age,
        gender_id,
        ethnicity,
        children,
        region_id,
        annual_income,
        health_insurance,
        education_level,
        height_cm,
        weight_kg,
        blood_id,
        heart_rate,
        avg_body_temperature,
        blood_sugar_level,
        allergies,
        underlying_conditions,
        genetic_diseases,
        reproductive_history,
        current_medications,
        medication_history,
        substance_use,
        dietary_habits,
        exercise_frequency,
        stress_id,
        profile_data
    ) VALUES (
        p_user_id,
        p_age,
        p_gender_id,
        p_ethnicity,
        p_children,
        p_region_id,
        p_annual_income,
        p_health_insurance,
        p_education_level,
        p_height_cm,
        p_weight_kg,
        p_blood_id,
        p_heart_rate,
        p_avg_body_temperature,
        p_blood_sugar_level,
        p_allergies,
        p_underlying_conditions,
        p_genetic_diseases,
        p_reproductive_history,
        p_current_medications,
        p_medication_history,
        p_substance_use,
        p_dietary_habits,
        p_exercise_frequency,
        p_stress_id,
        JSON_OBJECT(
            'age', p_age,
            'gender_id', p_gender_id,
            'ethnicity', p_ethnicity,
            'children', p_children,
            'region_id', p_region_id,
            'annual_income', p_annual_income,
            'health_insurance', p_health_insurance,
            'education_level', p_education_level,
            'height_cm', p_height_cm,
            'weight_kg', p_weight_kg,
            'blood_id', p_blood_id,
            'heart_rate', p_heart_rate,
            'avg_body_temperature', p_avg_body_temperature,
            'blood_sugar_level', p_blood_sugar_level,
            'allergies', p_allergies,
            'underlying_conditions', p_underlying_conditions,
            'genetic_diseases', p_genetic_diseases,
            'reproductive_history', p_reproductive_history,
            'current_medications', p_current_medications,
            'medication_history', p_medication_history,
            'substance_use', p_substance_use,
            'dietary_habits', p_dietary_habits,
            'exercise_frequency', p_exercise_frequency,
            'stress_id', p_stress_id
        )
    )
    ON DUPLICATE KEY UPDATE
        age = p_age,
        gender_id = p_gender_id,
        ethnicity = p_ethnicity,
        children = p_children,
        region_id = p_region_id,
        annual_income = p_annual_income,
        health_insurance = p_health_insurance,
        education_level = p_education_level,
        height_cm = p_height_cm,
        weight_kg = p_weight_kg,
        blood_id = p_blood_id,
        heart_rate = p_heart_rate,
        avg_body_temperature = p_avg_body_temperature,
        blood_sugar_level = p_blood_sugar_level,
        allergies = p_allergies,
        underlying_conditions = p_underlying_conditions,
        genetic_diseases = p_genetic_diseases,
        reproductive_history = p_reproductive_history,
        current_medications = p_current_medications,
        medication_history = p_medication_history,
        substance_use = p_substance_use,
        dietary_habits = p_dietary_habits,
        exercise_frequency = p_exercise_frequency,
        stress_id = p_stress_id,
        profile_data = JSON_OBJECT(
            'age', p_age,
            'gender_id', p_gender_id,
            'ethnicity', p_ethnicity,
            'children', p_children,
            'region_id', p_region_id,
            'annual_income', p_annual_income,
            'health_insurance', p_health_insurance,
            'education_level', p_education_level,
            'height_cm', p_height_cm,
            'weight_kg', p_weight_kg,
            'blood_id', p_blood_id,
            'heart_rate', p_heart_rate,
            'avg_body_temperature', p_avg_body_temperature,
            'blood_sugar_level', p_blood_sugar_level,
            'allergies', p_allergies,
            'underlying_conditions', p_underlying_conditions,
            'genetic_diseases', p_genetic_diseases,
            'reproductive_history', p_reproductive_history,
            'current_medications', p_current_medications,
            'medication_history', p_medication_history,
            'substance_use', p_substance_use,
            'dietary_habits', p_dietary_habits,
            'exercise_frequency', p_exercise_frequency,
            'stress_id', p_stress_id
        );
END //

CREATE PROCEDURE sp_LogAdminAction(
    IN p_admin_id INT,
    IN p_target_table VARCHAR(100),
    IN p_target_id INT,
    IN p_action_type VARCHAR(50),
    IN p_old_data JSON,
    IN p_new_data JSON,
    IN p_reason VARCHAR(255)
)
BEGIN
    INSERT INTO admin_actions (
        admin_id,
        target_table,
        target_id,
        action_type,
        old_data,
        new_data,
        reason
    ) VALUES (
        p_admin_id,
        p_target_table,
        p_target_id,
        p_action_type,
        p_old_data,
        p_new_data,
        p_reason
    );
END //

CREATE PROCEDURE sp_AdminGetUsers(
    IN p_role VARCHAR(20),
    IN p_status VARCHAR(20),
    IN p_keyword VARCHAR(100)
)
BEGIN
    SELECT
        user_id,
        username,
        email,
        role,
        status,
        email_verified,
        failed_attempts,
        last_login,
        is_deleted,
        deleted_at,
        created_at
    FROM users
    WHERE
        (p_role IS NULL OR role = p_role)
        AND (p_status IS NULL OR status = p_status)
        AND (
            p_keyword IS NULL
            OR username LIKE CONCAT('%', p_keyword, '%')
            OR email LIKE CONCAT('%', p_keyword, '%')
        )
    ORDER BY created_at DESC;
END //

CREATE PROCEDURE sp_AdminGetPredictions(
    IN p_user_id INT,
    IN p_model_id INT,
    IN p_date_from DATE,
    IN p_date_to DATE
)
BEGIN
    SELECT
        p.prediction_id,
        p.user_id,
        u.username,
        u.email,
        p.model_id,
        m.model_name,
        m.model_type,
        p.age,
        p.gender_id,
        g.gender_name,
        p.region_id,
        r.region_name,
        p.stress_id,
        s.level_name AS stress_level,
        p.bmi,
        p.annual_income,
        p.substance_use,
        p.exercise_frequency,
        p.predicted_cost,
        p.input_values,
        p.created_at
    FROM predictions p
    LEFT JOIN users u ON p.user_id = u.user_id
    LEFT JOIN models m ON p.model_id = m.model_id
    LEFT JOIN genders g ON p.gender_id = g.gender_id
    LEFT JOIN regions r ON p.region_id = r.region_id
    LEFT JOIN stress_levels s ON p.stress_id = s.stress_id
    WHERE
        (p_user_id IS NULL OR p.user_id = p_user_id)
        AND (p_model_id IS NULL OR p.model_id = p_model_id)
        AND (p_date_from IS NULL OR DATE(p.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(p.created_at) <= p_date_to)
    ORDER BY p.created_at DESC;
END //

CREATE PROCEDURE sp_AdminDashboardStats()
BEGIN
    SELECT
        (SELECT COUNT(*) FROM users WHERE is_deleted = FALSE) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_deleted = FALSE) AS total_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'staff' AND is_deleted = FALSE) AS total_staff,
        (SELECT COUNT(*) FROM users WHERE role = 'member' AND is_deleted = FALSE) AS total_members,
        (SELECT COUNT(*) FROM predictions) AS total_predictions,
        (SELECT COUNT(*) FROM predictions WHERE DATE(created_at) = CURDATE()) AS predictions_today,
        (SELECT COALESCE(AVG(predicted_cost), 0) FROM predictions) AS avg_predicted_cost,
        (SELECT COALESCE(MIN(predicted_cost), 0) FROM predictions) AS min_predicted_cost,
        (SELECT COALESCE(MAX(predicted_cost), 0) FROM predictions) AS max_predicted_cost,
        (SELECT COUNT(*) FROM activity_logs) AS total_activity_logs,
        (SELECT COUNT(*) FROM admin_actions) AS total_admin_actions;
END //

CREATE PROCEDURE sp_AdminStatsByModel()
BEGIN
    SELECT
        m.model_id,
        m.model_name,
        m.model_type,
        COUNT(p.prediction_id) AS total_predictions,
        COALESCE(AVG(p.predicted_cost), 0) AS avg_cost,
        COALESCE(MIN(p.predicted_cost), 0) AS min_cost,
        COALESCE(MAX(p.predicted_cost), 0) AS max_cost
    FROM models m
    LEFT JOIN predictions p ON m.model_id = p.model_id
    GROUP BY m.model_id, m.model_name, m.model_type
    ORDER BY m.model_id;
END //

CREATE PROCEDURE sp_AdminStatsByDate(
    IN p_date_from DATE,
    IN p_date_to DATE
)
BEGIN
    SELECT
        DATE(created_at) AS prediction_date,
        COUNT(*) AS total_predictions,
        COALESCE(AVG(predicted_cost), 0) AS avg_cost,
        COALESCE(MIN(predicted_cost), 0) AS min_cost,
        COALESCE(MAX(predicted_cost), 0) AS max_cost
    FROM predictions
    WHERE
        (p_date_from IS NULL OR DATE(created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(created_at) <= p_date_to)
    GROUP BY DATE(created_at)
    ORDER BY prediction_date DESC;
END //

CREATE PROCEDURE sp_AdminStatsByRegion()
BEGIN
    SELECT
        r.region_id,
        r.region_name,
        COUNT(p.prediction_id) AS total_predictions,
        COALESCE(AVG(p.predicted_cost), 0) AS avg_cost
    FROM regions r
    LEFT JOIN predictions p ON r.region_id = p.region_id
    GROUP BY r.region_id, r.region_name
    ORDER BY avg_cost DESC;
END //

CREATE PROCEDURE sp_AdminDeletePrediction(
    IN p_admin_id INT,
    IN p_prediction_id INT,
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_old_data JSON;

    SELECT JSON_OBJECT(
        'prediction_id', prediction_id,
        'user_id', user_id,
        'model_id', model_id,
        'age', age,
        'gender_id', gender_id,
        'region_id', region_id,
        'stress_id', stress_id,
        'bmi', bmi,
        'annual_income', annual_income,
        'substance_use', substance_use,
        'exercise_frequency', exercise_frequency,
        'input_values', input_values,
        'predicted_cost', predicted_cost,
        'created_at', created_at
    ) INTO v_old_data
    FROM predictions
    WHERE prediction_id = p_prediction_id;

    CALL sp_LogAdminAction(
        p_admin_id,
        'predictions',
        p_prediction_id,
        'hard_delete',
        v_old_data,
        NULL,
        p_reason
    );

    DELETE FROM predictions
    WHERE prediction_id = p_prediction_id;
END //

CREATE PROCEDURE sp_AdminDeleteAllPredictions(
    IN p_admin_id INT,
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_total INT DEFAULT 0;

    SELECT COUNT(*) INTO v_total
    FROM predictions;

    CALL sp_LogAdminAction(
        p_admin_id,
        'predictions',
        NULL,
        'hard_delete_all',
        JSON_OBJECT('total_predictions_before_delete', v_total),
        NULL,
        p_reason
    );

    DELETE FROM feedback;
    DELETE FROM predictions;
    ALTER TABLE predictions AUTO_INCREMENT = 1;
END //

CREATE PROCEDURE sp_AdminUpdateUserStatus(
    IN p_admin_id INT,
    IN p_user_id INT,
    IN p_status VARCHAR(20),
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_old_data JSON;
    DECLARE v_new_data JSON;

    SELECT JSON_OBJECT(
        'user_id', user_id,
        'username', username,
        'email', email,
        'role', role,
        'status', status
    ) INTO v_old_data
    FROM users
    WHERE user_id = p_user_id;

    UPDATE users
    SET status = p_status
    WHERE user_id = p_user_id;

    SELECT JSON_OBJECT(
        'user_id', user_id,
        'username', username,
        'email', email,
        'role', role,
        'status', status
    ) INTO v_new_data
    FROM users
    WHERE user_id = p_user_id;

    CALL sp_LogAdminAction(
        p_admin_id,
        'users',
        p_user_id,
        'update_status',
        v_old_data,
        v_new_data,
        p_reason
    );
END //

CREATE PROCEDURE sp_AdminUpdateUserRole(
    IN p_admin_id INT,
    IN p_user_id INT,
    IN p_role VARCHAR(20),
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_old_data JSON;
    DECLARE v_new_data JSON;

    SELECT JSON_OBJECT(
        'user_id', user_id,
        'username', username,
        'email', email,
        'role', role,
        'status', status
    ) INTO v_old_data
    FROM users
    WHERE user_id = p_user_id;

    UPDATE users
    SET role = p_role
    WHERE user_id = p_user_id;

    SELECT JSON_OBJECT(
        'user_id', user_id,
        'username', username,
        'email', email,
        'role', role,
        'status', status
    ) INTO v_new_data
    FROM users
    WHERE user_id = p_user_id;

    CALL sp_LogAdminAction(
        p_admin_id,
        'users',
        p_user_id,
        'update_role',
        v_old_data,
        v_new_data,
        p_reason
    );
END //

CREATE PROCEDURE sp_AdminGetActivityLogs(
    IN p_user_id INT,
    IN p_date_from DATE,
    IN p_date_to DATE
)
BEGIN
    SELECT
        al.log_id,
        al.user_id,
        u.username,
        u.email,
        al.action,
        al.created_at
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE
        (p_user_id IS NULL OR al.user_id = p_user_id)
        AND (p_date_from IS NULL OR DATE(al.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(al.created_at) <= p_date_to)
    ORDER BY al.created_at DESC;
END //

CREATE PROCEDURE sp_AdminGetAdminActions(
    IN p_admin_id INT,
    IN p_target_table VARCHAR(100),
    IN p_date_from DATE,
    IN p_date_to DATE
)
BEGIN
    SELECT
        aa.admin_action_id,
        aa.admin_id,
        u.username AS admin_username,
        u.email AS admin_email,
        aa.target_table,
        aa.target_id,
        aa.action_type,
        aa.old_data,
        aa.new_data,
        aa.reason,
        aa.created_at
    FROM admin_actions aa
    LEFT JOIN users u ON aa.admin_id = u.user_id
    WHERE
        (p_admin_id IS NULL OR aa.admin_id = p_admin_id)
        AND (p_target_table IS NULL OR aa.target_table = p_target_table)
        AND (p_date_from IS NULL OR DATE(aa.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(aa.created_at) <= p_date_to)
    ORDER BY aa.created_at DESC;
END //

CREATE TRIGGER trg_AfterPredictionInsert
AFTER INSERT ON predictions
FOR EACH ROW
BEGIN
    INSERT INTO activity_logs (user_id, action)
    VALUES (NEW.user_id, CONCAT('Thực hiện dự đoán với mô hình ID: ', NEW.model_id));
END //

CREATE TRIGGER trg_UpdateModelAccuracy
AFTER INSERT ON feedback
FOR EACH ROW
BEGIN
    DECLARE v_model_id INT;
    DECLARE v_avg_error DECIMAL(15,2);

    SELECT model_id INTO v_model_id
    FROM predictions
    WHERE prediction_id = NEW.prediction_id;

    SELECT AVG(ABS(p.predicted_cost - f.actual_cost)) INTO v_avg_error
    FROM predictions p
    JOIN feedback f ON p.prediction_id = f.prediction_id
    WHERE p.model_id = v_model_id AND f.actual_cost IS NOT NULL;

    UPDATE models
    SET accuracy_score = COALESCE(v_avg_error, 0)
    WHERE model_id = v_model_id;
END //

DELIMITER ;

CREATE OR REPLACE VIEW vw_dashboard_cost_analysis AS
SELECT
    'Lịch sử (Dataset)' AS source_type,
    r.region_name,
    AVG(m.charges) AS avg_cost,
    COUNT(*) AS total_cases
FROM medical_records m
JOIN regions r ON m.region_id = r.region_id
GROUP BY r.region_name
UNION ALL
SELECT
    'Dự đoán (Web App)' AS source_type,
    'Hệ thống' AS region_name,
    AVG(predicted_cost) AS avg_cost,
    COUNT(*) AS total_cases
FROM predictions;

CREATE OR REPLACE VIEW vw_admin_prediction_summary AS
SELECT
    p.prediction_id,
    p.user_id,
    u.username,
    u.email,
    p.model_id,
    m.model_name,
    m.model_type,
    p.age,
    p.gender_id,
    g.gender_name,
    p.region_id,
    r.region_name,
    p.stress_id,
    s.level_name AS stress_level,
    p.bmi,
    p.annual_income,
    p.substance_use,
    p.exercise_frequency,
    p.predicted_cost,
    p.input_values,
    p.created_at
FROM predictions p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN models m ON p.model_id = m.model_id
LEFT JOIN genders g ON p.gender_id = g.gender_id
LEFT JOIN regions r ON p.region_id = r.region_id
LEFT JOIN stress_levels s ON p.stress_id = s.stress_id;
USE healthcare_prediction;

DROP PROCEDURE IF EXISTS sp_AdminStatsByRegion;

DELIMITER //

CREATE PROCEDURE sp_AdminStatsByRegion()
BEGIN
    SELECT
        r.region_id,
        r.region_name,
        COUNT(p.prediction_id) AS total_predictions,
        COALESCE(AVG(p.predicted_cost), 0) AS avg_cost,
        COALESCE(MIN(p.predicted_cost), 0) AS min_cost,
        COALESCE(MAX(p.predicted_cost), 0) AS max_cost
    FROM regions r
    LEFT JOIN predictions p ON r.region_id = p.region_id
    GROUP BY r.region_id, r.region_name
    ORDER BY avg_cost DESC;
END //

DELIMITER ;
