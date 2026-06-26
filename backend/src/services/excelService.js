const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function readWorkbook(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("El archivo no existe o ya no esta disponible.");
  }

  return XLSX.readFile(filePath, {
    cellDates: true,
    dateNF: "yyyy-mm-dd"
  });
}

function rowsFromSheet(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`La hoja "${sheetName}" no existe en el archivo.`);
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false
  });
}

function getHeadersFromRows(rows) {
  const headers = [];
  const seen = new Set();

  rows.forEach((row) => {
    Object.keys(row).forEach((header) => {
      if (!seen.has(header)) {
        seen.add(header);
        headers.push(header);
      }
    });
  });

  return headers;
}

function getColumnProfiles(rows, headers, limit = 4) {
  return headers.map((header) => {
    const preview = [];

    for (const row of rows) {
      const value = row[header];

      if (value !== undefined && value !== null && String(value).trim()) {
        preview.push(String(value).trim());
      }

      if (preview.length >= limit) {
        break;
      }
    }

    return {
      header,
      preview,
      hasPreview: preview.length > 0
    };
  });
}

function getWorkbookSummary(filePath, preferredSheetName) {
  const workbook = readWorkbook(filePath);
  const sheetNames = workbook.SheetNames;
  const sheetName = preferredSheetName || sheetNames[0];
  const rows = rowsFromSheet(workbook, sheetName);
  const headers = getHeadersFromRows(rows);

  return {
    sheetNames,
    sheetName,
    headers,
    columnProfiles: getColumnProfiles(rows, headers),
    rows,
    preview: rows.slice(0, 8),
    totalRows: rows.length
  };
}

function writeWorkbook(filePath, sheetName, rows) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  XLSX.writeFile(workbook, filePath);
}

module.exports = {
  readWorkbook,
  rowsFromSheet,
  getHeadersFromRows,
  getColumnProfiles,
  getWorkbookSummary,
  writeWorkbook
};
