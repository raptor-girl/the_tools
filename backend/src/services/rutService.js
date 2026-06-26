const { formatRut, calculateRutVerifier, cleanRutValue } = require("../utils/rut");

function normalizeRut(value) {
  return formatRut(value);
}

function normalizeRutList(values) {
  return values.map((value, index) => {
    const result = normalizeRut(value);

    return {
      rowNumber: index + 1,
      original: value,
      normalized: result.value,
      valid: result.valid,
      error: result.error
    };
  });
}

function normalizeRutLines(text) {
  return normalizeRutList(
    String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function normalizeRutExcelRows(rows, columnName) {
  return rows.map((row, index) => {
    const original = row[columnName];
    const result = normalizeRut(original);

    return {
      ...row,
      [`${columnName}_original`]: original,
      [columnName]: result.value,
      [`${columnName}_estado`]: result.valid ? "valido" : "invalido",
      [`${columnName}_error`]: result.error || ""
    };
  });
}

function buildRutExportRows(results) {
  return results.map((result) => ({
    rut_normalizado: result.normalized,
    valido: result.valid ? "Si" : "No",
    error: result.error || ""
  }));
}

module.exports = {
  cleanRutValue,
  calculateRutVerifier,
  normalizeRut,
  normalizeRutList,
  normalizeRutLines,
  normalizeRutExcelRows,
  buildRutExportRows
};
