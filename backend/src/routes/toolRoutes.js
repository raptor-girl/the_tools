const express = require("express");
const toolController = require("../controllers/toolController");

const router = express.Router();

router.post("/format-rut", toolController.formatRutTool);
router.post("/format-ruts", toolController.normalizeRutListTool);
router.post("/format-ruts-excel", toolController.normalizeRutExcelTool);
router.post("/normalize-text", toolController.normalizeTextTool);
router.post("/normalize-texts", toolController.normalizeTextListTool);
router.post("/normalize-texts-excel", toolController.normalizeTextExcelTool);

module.exports = router;
