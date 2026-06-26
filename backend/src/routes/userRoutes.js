const express = require("express");
const userController = require("../controllers/userController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAdmin, userController.listUsers);
router.post("/", requireAdmin, userController.createAdmin);

module.exports = router;
