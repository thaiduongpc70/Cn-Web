const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const { tokenRequired } = require("../middlewares/auth.middleware");

router.get("/profile", tokenRequired, userController.getProfile);
router.post("/profile", tokenRequired, userController.saveProfile);
router.post("/change_password", tokenRequired, userController.changePassword);

module.exports = router;