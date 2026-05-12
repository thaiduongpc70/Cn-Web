import os
import math
import joblib
import numpy as np
import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

BASIC_MODEL_PATH = os.path.join(MODEL_DIR, "medical_model_v1.pkl")
ADVANCED_MODEL_PATH = os.path.join(MODEL_DIR, "medical_model_v2.pkl")


MODEL_CACHE = {
    "basic": None,
    "advanced": None,
}


GENDER_MAP = {
    1: "Male",
    2: "Female",
    3: "Other",
    "1": "Male",
    "2": "Female",
    "3": "Other",
    "Male": "Male",
    "Female": "Female",
    "Other": "Other",
    "Nam": "Male",
    "Nữ": "Female",
    "Khác": "Other",
}


BLOOD_TYPE_MAP = {
    1: "A",
    2: "B",
    3: "AB",
    4: "O",
    "1": "A",
    "2": "B",
    "3": "AB",
    "4": "O",
    "A": "A",
    "B": "B",
    "AB": "AB",
    "O": "O",
}


REGION_MAP = {
    1: "Hà Nội",
    2: "TP.Hồ Chí Minh",
    3: "Đà Nẵng",
    4: "Hải Phòng",
    5: "Cần Thơ",
    6: "An Giang",
    7: "Bà Rịa - Vũng Tàu",
    8: "Bắc Giang",
    9: "Bắc Ninh",
    10: "Bến Tre",
    11: "Bình Dương",
    12: "Bình Định",
    13: "Bình Phước",
    14: "Bình Thuận",
    15: "Cà Mau",
    16: "Cao Bằng",
    17: "Đắk Lắk",
    18: "Đắk Nông",
    19: "Điện Biên",
    20: "Đồng Nai",
    21: "Đồng Tháp",
    22: "Gia Lai",
    23: "Hà Giang",
    24: "Hà Nam",
    25: "Hà Tĩnh",
    26: "Hải Dương",
    27: "Hậu Giang",
    28: "Hòa Bình",
}


STRESS_MAP = {
    1: "Low",
    2: "Low",
    3: "Low",
    4: "Medium",
    5: "Medium",
    6: "Medium",
    7: "High",
    8: "High",
    9: "High",
    10: "High",
    "1": "Low",
    "2": "Low",
    "3": "Low",
    "4": "Medium",
    "5": "Medium",
    "6": "Medium",
    "7": "High",
    "8": "High",
    "9": "High",
    "10": "High",
    "Low": "Low",
    "Medium": "Medium",
    "High": "High",
}


FEATURE_LABEL_MAP = {
    "age": "Độ tuổi",
    "height_cm": "Chiều cao",
    "weight_kg": "Cân nặng",
    "children": "Số con",
    "annual_income": "Thu nhập năm",
    "heart_rate": "Nhịp tim",
    "avg_body_temperature": "Nhiệt độ cơ thể",
    "blood_sugar_level": "Đường huyết",
    "bmi": "BMI",
    "substance_score": "Điểm chất kích thích",
    "bmi_substance_int": "Tương tác BMI - chất kích thích",
    "has_condition": "Có bệnh nền",
    "age_condition_int": "Tương tác tuổi - bệnh nền",
    "income_per_age": "Thu nhập theo tuổi",
    "bmi_smoker_int": "Tương tác BMI - hút thuốc",
    "age_bmi": "Tương tác tuổi - BMI",
    "is_elderly": "Người cao tuổi",
    "gender": "Giới tính",
    "blood_type": "Nhóm máu",
    "region": "Khu vực sống",
    "dietary_habits": "Thói quen ăn uống",
    "exercise_frequency": "Tần suất tập thể dục",
    "substance_use": "Chất kích thích",
    "health_insurance": "Bảo hiểm y tế",
    "education_level": "Trình độ học vấn",
    "allergies": "Dị ứng",
    "underlying_conditions": "Bệnh nền",
    "genetic_diseases": "Bệnh di truyền",
    "current_medications": "Thuốc đang dùng",
    "medication_history": "Tiền sử dùng thuốc",
    "reproductive_history": "Tiền sử sinh sản",
    "ethnicity": "Dân tộc",
    "stress_level": "Mức độ căng thẳng",
}


def safe_float(value, default=0.0):
    if value is None or value == "":
        return default

    try:
        result = float(value)

        if math.isnan(result) or math.isinf(result):
            return default

        return result
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    if value is None or value == "":
        return default

    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def safe_str(value, default="Không"):
    if value is None:
        return default

    value = str(value).strip()

    if value == "":
        return default

    return value


def load_model(model_type):
    model_type = str(model_type or "basic").strip().lower()

    if model_type not in ["basic", "advanced"]:
        model_type = "basic"

    if MODEL_CACHE[model_type] is not None:
        return MODEL_CACHE[model_type]

    model_path = BASIC_MODEL_PATH if model_type == "basic" else ADVANCED_MODEL_PATH

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Không tìm thấy model file: {model_path}. "
            "Hãy kiểm tra thư mục backend/models."
        )

    model = joblib.load(model_path)
    MODEL_CACHE[model_type] = model

    return model


def calculate_bmi(height_cm, weight_kg):
    height_cm = safe_float(height_cm, 0)
    weight_kg = safe_float(weight_kg, 0)

    if height_cm <= 0 or weight_kg <= 0:
        return 0.0

    height_m = height_cm / 100

    return round(weight_kg / (height_m ** 2), 2)


def get_substance_score(substance_use):
    substance_use = safe_str(substance_use, "None")

    score_map = {
        "None": 0,
        "Không": 0,
        "Alcohol": 1,
        "Rượu bia": 1,
        "Smoker": 2,
        "Thuốc lá": 2,
        "Both": 3,
        "Cả hai": 3,
        "Cả rượu và thuốc lá": 3,
    }

    return score_map.get(substance_use, 0)


def has_medical_condition(value):
    value = safe_str(value, "Không").lower()

    no_values = [
        "không",
        "none",
        "no",
        "normal",
        "khong",
        "không có",
        "khong co",
        "n/a",
        "na",
    ]

    return 0 if value in no_values else 1


def get_gender_value(data):
    raw_gender = data.get("gender")
    gender_id = data.get("gender_id")

    if raw_gender:
        return GENDER_MAP.get(raw_gender, safe_str(raw_gender, "Male"))

    return GENDER_MAP.get(gender_id, "Male")


def get_blood_type_value(data):
    raw_blood_type = data.get("blood_type")
    blood_id = data.get("blood_id")

    if raw_blood_type:
        return BLOOD_TYPE_MAP.get(raw_blood_type, safe_str(raw_blood_type, "A"))

    return BLOOD_TYPE_MAP.get(blood_id, "A")


def get_region_value(data):
    raw_region = data.get("region")
    region_id = data.get("region_id")

    if raw_region:
        return safe_str(raw_region, "Hà Nội")

    return REGION_MAP.get(safe_int(region_id, 1), "Hà Nội")


def get_stress_level_value(data):
    raw_stress_level = data.get("stress_level")
    stress_id = data.get("stress_id")

    if raw_stress_level:
        return STRESS_MAP.get(raw_stress_level, safe_str(raw_stress_level, "Low"))

    return STRESS_MAP.get(stress_id, "Low")


def get_model_feature_names(model):
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)

    if hasattr(model, "named_steps"):
        for _step_name, step in model.named_steps.items():
            if hasattr(step, "feature_names_in_"):
                return list(step.feature_names_in_)

    return []


def build_base_features(data):
    age = safe_int(data.get("age"), 30)
    height_cm = safe_float(data.get("height_cm"), 165)
    weight_kg = safe_float(data.get("weight_kg"), 60)
    children = safe_int(data.get("children"), 0)
    annual_income = safe_float(data.get("annual_income"), 3000)

    bmi = calculate_bmi(height_cm, weight_kg)
    substance_use = safe_str(data.get("substance_use"), "None")
    substance_score = get_substance_score(substance_use)

    underlying_conditions = safe_str(data.get("underlying_conditions"), "Không")
    has_condition = has_medical_condition(underlying_conditions)

    is_smoker = 1 if substance_use in [
        "Smoker",
        "Both",
        "Thuốc lá",
        "Cả hai",
        "Cả rượu và thuốc lá",
    ] else 0

    features = {
        "age": age,
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "children": children,
        "annual_income": annual_income,
        "heart_rate": safe_int(data.get("heart_rate"), 75),
        "avg_body_temperature": safe_float(data.get("avg_body_temperature"), 36.8),
        "blood_sugar_level": safe_int(data.get("blood_sugar_level"), 95),
        "bmi": bmi,
        "substance_score": substance_score,
        "bmi_substance_int": round(bmi * substance_score, 4),
        "has_condition": has_condition,
        "age_condition_int": age * has_condition,
        "income_per_age": round(annual_income / max(age, 1), 4),
        "bmi_smoker_int": round(bmi * is_smoker, 4),
        "age_bmi": round(age * bmi, 4),
        "is_elderly": 1 if age >= 60 else 0,
        "gender": get_gender_value(data),
        "blood_type": get_blood_type_value(data),
        "substance_use": substance_use,
        "region": get_region_value(data),
        "allergies": safe_str(data.get("allergies"), "Không"),
        "underlying_conditions": underlying_conditions,
        "genetic_diseases": safe_str(data.get("genetic_diseases"), "Không"),
        "ethnicity": safe_str(data.get("ethnicity"), "Kinh"),
        "stress_level": get_stress_level_value(data),
        "dietary_habits": safe_str(data.get("dietary_habits"), "Average"),
        "exercise_frequency": safe_str(data.get("exercise_frequency"), "Sometimes"),
        "current_medications": safe_str(data.get("current_medications"), "Không"),
        "medication_history": safe_str(data.get("medication_history"), "Không"),
        "reproductive_history": safe_str(data.get("reproductive_history"), "0"),
        "health_insurance": safe_str(data.get("health_insurance"), "yes"),
        "education_level": safe_str(data.get("education_level"), "Phổ thông"),
    }

    return features


def build_prediction_dataframe(data, model):
    base_features = build_base_features(data)
    feature_names = get_model_feature_names(model)

    if not feature_names:
        return pd.DataFrame([base_features])

    row = {}

    for feature in feature_names:
        if feature in base_features:
            row[feature] = base_features[feature]
        else:
            row[feature] = 0

    return pd.DataFrame([row], columns=feature_names)


def reverse_log_prediction(raw_prediction):
    raw_prediction = safe_float(raw_prediction, 0)

    if raw_prediction <= 0:
        return 0.0

    try:
        if raw_prediction < 30:
            real_value = float(np.expm1(raw_prediction))
        else:
            real_value = raw_prediction

        if math.isnan(real_value) or math.isinf(real_value):
            return 0.0

        return round(max(real_value, 0), 2)

    except OverflowError:
        return 0.0


def get_final_estimator(model):
    if hasattr(model, "named_steps") and hasattr(model, "steps"):
        return model.steps[-1][1]

    return model


def get_preprocessor(model):
    if not hasattr(model, "named_steps"):
        return None

    possible_names = [
        "preprocessor",
        "preprocess",
        "columntransformer",
        "transformer",
        "processor",
    ]

    for name in possible_names:
        if name in model.named_steps:
            return model.named_steps[name]

    for _step_name, step in model.named_steps.items():
        if hasattr(step, "get_feature_names_out"):
            return step

    return None


def normalize_transformed_feature_name(name):
    name = str(name)

    if "__" in name:
        name = name.split("__", 1)[1]

    name = name.replace("remainder__", "")

    known_base_features = sorted(
        FEATURE_LABEL_MAP.keys(),
        key=len,
        reverse=True,
    )

    for base_name in known_base_features:
        if name == base_name:
            return base_name

        if name.startswith(base_name + "_"):
            return base_name

    return name


def clean_feature_label(name):
    base_name = normalize_transformed_feature_name(name)

    return FEATURE_LABEL_MAP.get(base_name, base_name)


def extract_top_features(model, top_n=10):
    estimator = get_final_estimator(model)

    if not hasattr(estimator, "feature_importances_"):
        return []

    importances = np.asarray(estimator.feature_importances_, dtype=float)

    if importances.size == 0:
        return []

    feature_names = None
    preprocessor = get_preprocessor(model)

    if preprocessor is not None:
        try:
            feature_names = list(preprocessor.get_feature_names_out())
        except Exception:
            feature_names = None

    if feature_names is None:
        try:
            feature_names = list(model.feature_names_in_)
        except Exception:
            feature_names = [f"feature_{i}" for i in range(len(importances))]

    if len(feature_names) != len(importances):
        return []

    grouped_importances = {}

    for raw_name, importance in zip(feature_names, importances):
        base_name = normalize_transformed_feature_name(raw_name)
        grouped_importances[base_name] = grouped_importances.get(base_name, 0.0) + float(importance)

    if not grouped_importances:
        return []

    sorted_items = sorted(
        grouped_importances.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    top_items = sorted_items[:top_n]

    return [
        {
            "name": clean_feature_label(name),
            "key": name,
            "importance": round(float(importance), 4),
            "percent": round(float(importance) * 100, 2),
        }
        for name, importance in top_items
    ]


def make_prediction(data):
    if data is None:
        data = {}

    model_type = str(data.get("model_type", "basic")).strip().lower()

    if model_type not in ["basic", "advanced"]:
        model_type = "basic"

    model = load_model(model_type)
    df_predict = build_prediction_dataframe(data, model)

    raw_prediction = model.predict(df_predict)[0]
    predicted_cost = reverse_log_prediction(raw_prediction)

    base_features = build_base_features(data)
    top_features = extract_top_features(model, top_n=10)

    return {
        "predicted_cost": predicted_cost,
        "bmi": base_features.get("bmi", 0),
        "top_features": top_features,
        "model_type": model_type,
        "model_explanation": {
            "note": "Top 10 yếu tố ảnh hưởng được tính từ feature_importances_ của mô hình cây nếu model hỗ trợ.",
            "raw_prediction": round(safe_float(raw_prediction, 0), 4),
            "prediction_scale": "log1p_to_real_cost",
        },
    }


def predict_cost(data):
    return make_prediction(data)


def predict(data):
    return make_prediction(data)