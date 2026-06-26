const express = require("express");
const mappingController = require("../controllers/mappingController");

const router = express.Router();

router.get("/", mappingController.listMappings);
router.post("/", mappingController.saveMapping);

module.exports = router;
