const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const predictionRoutes = require("./prediction.routes");
const adminRoutes = require("./admin.routes");

router.use("/", healthRoutes);
router.use("/", authRoutes);
router.use("/", userRoutes);
router.use("/", predictionRoutes);

router.use("/admin", adminRoutes);

module.exports = router;