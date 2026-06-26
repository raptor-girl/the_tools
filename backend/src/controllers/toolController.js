const path = require("path");
const { randomUUID } = require("crypto");
const rutService = require("../services/rutService");
const textNormalizeService = require("../services/textNormalizeService");
const fileStorage = require("../services/fileStorageService");
const { getWorkbookSummary, writeWorkbook } = require("../services/excelService");

function formatRutTool(req, res) {
  return res.json({
    ok: true,
    data: rutService.normalizeRut(req.body.rut)
  });
}

function normalizeTextTool(req, res) {
  return res.json({
    ok: true,
    data: {
      value: textNormalizeService.normalizeTextValue(req.body.value, {
        mode: req.body.mode || "none",
        removeOddCharacters: req.body.removeOddCharacters
      })
    }
  });
}

function buildDownloadPayload(fileName, extra = {}) {
  return {
    ...extra,
    outputFile: fileName,
    downloadUrl: `/api/files/download/${fileName}`
  };
}

function normalizeRutListTool(req, res) {
  const results = rutService.normalizeRutLines(req.body.values || req.body.ruts || "");
  const fileName = `ruts-${randomUUID()}.xlsx`;

  writeWorkbook(
    path.join(fileStorage.resolveExportsDir(), fileName),
    "ruts",
    rutService.buildRutExportRows(results)
  );

  return res.json({
    ok: true,
    data: buildDownloadPayload(fileName, {
      totalRows: results.length,
      validCount: results.filter((result) => result.valid).length,
      errorCount: results.filter((result) => !result.valid).length,
      preview: rutService.buildRutExportRows(results).slice(0, 20)
    })
  });
}

async function normalizeRutExcelTool(req, res) {
  const { fileId, sheetName, column } = req.body;

  if (!fileId || !column) {
    return res.status(400).json({
      ok: false,
      message: "fileId y column son obligatorios."
    });
  }

  try {
    const fileMeta = await fileStorage.findFileMeta(fileId);

    if (!fileMeta) {
      return res.status(404).json({
        ok: false,
        message: "Archivo no encontrado."
      });
    }

    const summary = getWorkbookSummary(fileMeta.path, sheetName);
    const rows = rutService.normalizeRutExcelRows(summary.rows, column);
    const fileName = `ruts-excel-${fileId}.xlsx`;

    writeWorkbook(path.join(fileStorage.resolveExportsDir(), fileName), "ruts", rows);

    return res.json({
      ok: true,
      data: buildDownloadPayload(fileName, {
        totalRows: rows.length,
        preview: rows.slice(0, 20)
      })
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible normalizar RUTs desde Excel.",
      detail: error.message
    });
  }
}

function normalizeTextListTool(req, res) {
  const results = textNormalizeService.normalizeTextLines(req.body.values || "", {
    mode: req.body.mode || "none",
    removeOddCharacters: req.body.removeOddCharacters
  });
  const fileName = `textos-${randomUUID()}.xlsx`;

  writeWorkbook(
    path.join(fileStorage.resolveExportsDir(), fileName),
    "textos",
    textNormalizeService.buildTextExportRows(results)
  );

  return res.json({
    ok: true,
    data: buildDownloadPayload(fileName, {
      totalRows: results.length,
      preview: textNormalizeService.buildTextExportRows(results).slice(0, 20)
    })
  });
}

async function normalizeTextExcelTool(req, res) {
  const { fileId, sheetName, columns, mode, removeOddCharacters } = req.body;
  const selectedColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];

  if (!fileId || !selectedColumns.length) {
    return res.status(400).json({
      ok: false,
      message: "fileId y al menos una columna son obligatorios."
    });
  }

  try {
    const fileMeta = await fileStorage.findFileMeta(fileId);

    if (!fileMeta) {
      return res.status(404).json({
        ok: false,
        message: "Archivo no encontrado."
      });
    }

    const summary = getWorkbookSummary(fileMeta.path, sheetName);
    const rows = textNormalizeService.normalizeTextExcelRows(
      summary.rows,
      selectedColumns,
      {
        mode: mode || "none",
        removeOddCharacters
      }
    );
    const fileName = `textos-excel-${fileId}.xlsx`;

    writeWorkbook(path.join(fileStorage.resolveExportsDir(), fileName), "textos", rows);

    return res.json({
      ok: true,
      data: buildDownloadPayload(fileName, {
        totalRows: rows.length,
        preview: rows.slice(0, 20)
      })
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No fue posible normalizar textos desde Excel.",
      detail: error.message
    });
  }
}

module.exports = {
  formatRutTool,
  normalizeTextTool,
  normalizeRutListTool,
  normalizeRutExcelTool,
  normalizeTextListTool,
  normalizeTextExcelTool
};
