const express = require("express");
const uploadController = require("../controllers/uploadController");
const { parseExcelUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/upload", parseExcelUpload, uploadController.uploadExcel);
router.post("/preview", uploadController.previewSheet);
router.post("/process", uploadController.processExcel);
router.get("/download/:fileName", uploadController.downloadFile);

module.exports = router;
