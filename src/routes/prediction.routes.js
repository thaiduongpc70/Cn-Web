const express = require("express");
const router = express.Router();

const predictionController = require("../controllers/prediction.controller");
const { tokenRequired } = require("../middlewares/auth.middleware");

router.post("/predict", tokenRequired, predictionController.predictAndSave);
router.get("/history", tokenRequired, predictionController.getUserHistory);
router.get("/history/:prediction_id", tokenRequired, predictionController.getPredictionDetail);

module.exports = router;