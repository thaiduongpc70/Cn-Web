const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { tokenRequired, adminRequired } = require("../middlewares/auth.middleware");

router.use(tokenRequired);
router.use(adminRequired);

router.get("/dashboard", adminController.dashboard);
router.get("/users", adminController.getUsers);
router.get("/predictions", adminController.getPredictions);
router.delete("/predictions/:prediction_id", adminController.deletePrediction);
router.delete("/predictions", adminController.deleteAllPredictions);

router.get("/stats/model", adminController.statsByModel);
router.get("/stats/date", adminController.statsByDate);
router.get("/stats/region", adminController.statsByRegion);

router.patch("/users/:user_id/status", adminController.updateUserStatus);
router.patch("/users/:user_id/role", adminController.updateUserRole);

router.get("/activity-logs", adminController.activityLogs);
router.get("/admin-actions", adminController.adminActions);

module.exports = router;