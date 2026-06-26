const { normalizeText } = require("../utils/text");

const TEXT_MODES = new Set(["lower", "upper", "capitalize", "none"]);

function normalizeTextValue(value, options = {}) {
  const mode = TEXT_MODES.has(options.mode) ? options.mode : "none";

  return normalizeText(value, {
    mode,
    removeOddCharacters: Boolean(options.removeOddCharacters)
  });
}

function normalizeTextLines(text, options = {}) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line, index) => ({
      rowNumber: index + 1,
      original: line,
      normalized: normalizeTextValue(line, options)
    }))
    .filter((row) => row.original.trim() || row.normalized);
}

function normalizeTextExcelRows(rows, columns, options = {}) {
  return rows.map((row) => {
    const nextRow = { ...row };

    columns.forEach((column) => {
      nextRow[`${column}_original`] = row[column];
      nextRow[column] = normalizeTextValue(row[column], options);
    });

    return nextRow;
  });
}

function buildTextExportRows(results) {
  return results.map((result) => ({
    texto_normalizado: result.normalized
  }));
}

module.exports = {
  normalizeTextValue,
  normalizeTextLines,
  normalizeTextExcelRows,
  buildTextExportRows
};
