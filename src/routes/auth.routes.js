const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { tokenRequired } = require("../middlewares/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", tokenRequired, authController.getMe);

module.exports = router;