const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { getWorkbookSummary, writeWorkbook } = require("../services/excelService");
const {
  prepareMoodleRows,
  buildIssueRows
} = require("../services/moodleTransformService");
const { detectColumnMapping } = require("../utils/columnDetector");
const fileStorage = require("../services/fileStorageService");
const fileModel = require("../models/fileModel");
const mappingModel = require("../models/mappingModel");

function resolveUploadsDir() {
  return fileStorage.resolveUploadsDir();
}

function resolveExportsDir() {
  return fileStorage.resolveExportsDir();
}

async function findFileMeta(fileId) {
  return fileStorage.findFileMeta(fileId);
}

async function uploadExcel(req, res) {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: "Debes subir un archivo .xlsx o .xls."
    });
  }

  try {
    const fileId = randomUUID();
    const summary = getWorkbookSummary(req.file.path);
    const detection = detectColumnMapping(summary.headers, summary.rows);

    fileStorage.rememberUploadedFile(fileId, {
      id: fileId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      path: req.file.path
    });

    try {
      await fileModel.createUploadedFile({
        id: fileId,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        sheetName: summary.sheetName,
        uploadedBy: req.session.user.id,
        totalRows: summary.totalRows
      });
    } catch (dbError) {
      // El procesamiento puede seguir vivo aunque MySQL aun no este configurado.
      console.warn("No se pudo guardar uploaded_file:", dbError.message);
    }

    return res.status(201).json({
      ok: true,
      data: {
        fileId,
        originalName: req.file.originalname,
        sheetNames: summary.sheetNames,
        selectedSheet: summary.sheetName,
        headers: summary.headers,
        columnProfiles: summary.columnProfiles,
        preview: summary.preview,
        totalRows: summary.totalRows,
        detectedMapping: detection.mapping,
        missingMapping: detection.missing
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible leer el Excel.",
      detail: error.message
    });
  }
}

async function previewSheet(req, res) {
  const { fileId, sheetName } = req.body;

  if (!fileId || !sheetName) {
    return res.status(400).json({
      ok: false,
      message: "fileId y sheetName son obligatorios."
    });
  }

  try {
    const fileMeta = await findFileMeta(fileId);

    if (!fileMeta || !fs.existsSync(fileMeta.path)) {
      return res.status(404).json({
        ok: false,
        message: "El archivo cargado no existe o expiro."
      });
    }

    const summary = getWorkbookSummary(fileMeta.path, sheetName);
    const detection = detectColumnMapping(summary.headers, summary.rows);

    return res.json({
      ok: true,
      data: {
        selectedSheet: summary.sheetName,
        headers: summary.headers,
        columnProfiles: summary.columnProfiles,
        preview: summary.preview,
        totalRows: summary.totalRows,
        detectedMapping: detection.mapping,
        missingMapping: detection.missing
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible leer la hoja seleccionada.",
      detail: error.message
    });
  }
}

async function processExcel(req, res) {
  const { fileId, sheetName, mapping, textMode, saveMappingName } = req.body;

  if (!fileId || !mapping) {
    return res.status(400).json({
      ok: false,
      message: "fileId y mapping son obligatorios."
    });
  }

  try {
    const fileMeta = await findFileMeta(fileId);

    if (!fileMeta || !fs.existsSync(fileMeta.path)) {
      return res.status(404).json({
        ok: false,
        message: "El archivo cargado no existe o expiro."
      });
    }

    const summary = getWorkbookSummary(fileMeta.path, sheetName);
    const { totalRows, processedRows, errors, warnings } = prepareMoodleRows(
      summary.rows,
      mapping,
      {
        textMode: textMode || "capitalize"
      }
    );
    const duplicates = warnings.filter((warning) => warning.field === "duplicate");
    const nonDuplicateWarnings = warnings.filter(
      (warning) => warning.field !== "duplicate"
    );

    const exportsDir = resolveExportsDir();
    const outputFile = `moodle-${fileId}.xlsx`;
    const errorReportFile =
      errors.length || warnings.length ? `reporte-${fileId}.xlsx` : null;

    writeWorkbook(path.join(exportsDir, outputFile), "moodle", processedRows);

    if (errorReportFile) {
      writeWorkbook(
        path.join(exportsDir, errorReportFile),
        "reporte",
        [
          ...buildIssueRows(errors, "error"),
          ...buildIssueRows(warnings, "advertencia")
        ]
      );
    }

    let historyId = null;

    try {
      historyId = await fileModel.createProcessHistory({
        uploadedFileId: fileId,
        userId: req.session.user.id,
        outputFile,
        errorReportFile,
        processedCount: processedRows.length,
        errorCount: errors.length
      });

      await fileModel.createProcessErrors(historyId, errors);

      if (saveMappingName) {
        await mappingModel.saveMapping({
          userId: req.session.user.id,
          name: saveMappingName,
          mapping,
          originalHeaders: summary.headers
        });
      }
    } catch (dbError) {
      console.warn("No se pudo guardar historial/mapeo:", dbError.message);
    }

    return res.json({
      ok: true,
      data: {
        historyId,
        totalRows,
        processedCount: processedRows.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        duplicateCount: duplicates.length,
        outputFile,
        errorReportFile,
        downloadUrl: `/api/files/download/${outputFile}`,
        errorReportUrl: errorReportFile
          ? `/api/files/download/${errorReportFile}`
          : null,
        errors: errors.slice(0, 100),
        warnings: nonDuplicateWarnings.slice(0, 100),
        duplicates: duplicates.slice(0, 100),
        preview: processedRows.slice(0, 8)
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible procesar el Excel.",
      detail: error.message
    });
  }
}

function downloadFile(req, res) {
  const safeName = path.basename(req.params.fileName);
  const filePath = path.join(resolveExportsDir(), safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      ok: false,
      message: "Archivo no encontrado."
    });
  }

  return res.download(filePath, safeName);
}

module.exports = {
  uploadExcel,
  previewSheet,
  processExcel,
  downloadFile,
  findFileMeta,
  resolveUploadsDir
};
