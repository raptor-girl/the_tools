const rutService = require("./rutService");
const textNormalizeService = require("./textNormalizeService");
const validationService = require("./validationService");

function getMappedValue(row, mapping, field) {
  const columnName = mapping[field];

  if (!columnName) {
    return "";
  }

  if (Object.prototype.hasOwnProperty.call(row, columnName)) {
    return row[columnName];
  }

  // Fallback defensivo para archivos donde el header trae espacios invisibles.
  const matchingKey = Object.keys(row).find(
    (key) => key.trim().toLowerCase() === String(columnName).trim().toLowerCase()
  );

  return matchingKey ? row[matchingKey] : "";
}

function normalizeEmailValue(value) {
  const text = textNormalizeService.normalizeTextValue(value, {
    mode: "none",
    removeOddCharacters: false
  });
  const mailtoMatch = text.match(/mailto:([^\)\]\s]+)/i);
  const bracketMatch = text.match(/\[([^\]]+@[^\]]+)\]/);
  const plainMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = mailtoMatch?.[1] || bracketMatch?.[1] || plainMatch?.[0] || text;

  return email.replace(/\s+/g, "").toLowerCase();
}

function splitFullName(value) {
  const normalized = textNormalizeService.normalizeTextValue(value, {
    mode: "capitalize"
  });
  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstname: normalized,
      lastname: ""
    };
  }

  if (parts.length === 2) {
    return {
      firstname: parts[0],
      lastname: parts[1]
    };
  }

  if (parts.length === 3) {
    return {
      firstname: parts.slice(0, 2).join(" "),
      lastname: parts[2]
    };
  }

  return {
    firstname: parts.slice(0, -2).join(" "),
    lastname: parts.slice(-2).join(" ")
  };
}

function transformRowWithMapping(row, mapping, options = {}) {
  const textMode = options.textMode || "capitalize";
  const role = options.role || "student";
  const rutResult = rutService.normalizeRut(getMappedValue(row, mapping, "rut"));
  const rawFirstname = getMappedValue(row, mapping, "firstname");
  const rawLastname = getMappedValue(row, mapping, "lastname");
  const rawFullname = getMappedValue(row, mapping, "fullname");
  const rawCourse = getMappedValue(row, mapping, "course");
  const warnings = [];
  let firstname = "";
  let lastname = "";

  if (rawFirstname || rawLastname) {
    firstname = textNormalizeService.normalizeTextValue(rawFirstname, {
      mode: textMode
    });
    lastname = textNormalizeService.normalizeTextValue(rawLastname, {
      mode: textMode
    });
  } else if (rawFullname) {
    const splitName = splitFullName(rawFullname);
    firstname = textNormalizeService.normalizeTextValue(splitName.firstname, {
      mode: textMode
    });
    lastname = textNormalizeService.normalizeTextValue(splitName.lastname, {
      mode: textMode
    });
    warnings.push({
      field: "fullname",
      message: "Nombre completo separado automaticamente"
    });
  }

  if (!lastname && rawFullname && (rawFirstname || rawLastname)) {
    const splitName = splitFullName(rawFullname);
    lastname = textNormalizeService.normalizeTextValue(splitName.lastname, {
      mode: textMode
    });
    warnings.push({
      field: "fullname",
      message: "Apellido completado desde nombre completo"
    });
  }

  const moodleRow = {
    username: rutResult.value,
    firstname,
    lastname,
    email: normalizeEmailValue(getMappedValue(row, mapping, "email")),
    course1: textNormalizeService.normalizeTextValue(rawCourse, {
      mode: "none"
    }),
    role1: role
  };

  return {
    row: moodleRow,
    meta: {
      rutValid: rutResult.valid,
      rutError: rutResult.error
    },
    warnings
  };
}

function duplicateKeyForRecord(record) {
  if (record.transformed.username && record.meta.rutValid) {
    return {
      type: "RUT",
      value: record.transformed.username
    };
  }

  if (record.transformed.email) {
    return {
      type: "email",
      value: record.transformed.email
    };
  }

  return null;
}

function addDuplicateWarnings(records, warnings) {
  const groups = new Map();

  records.forEach((record) => {
    const key = duplicateKeyForRecord(record);

    if (!key) {
      return;
    }

    const groupKey = `${key.type}:${key.value}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        ...key,
        records: []
      });
    }

    groups.get(groupKey).records.push(record);
  });

  groups.forEach((group) => {
    if (group.records.length < 2) {
      return;
    }

    const relatedRows = group.records.map((record) => record.rowNumber).join(", ");

    group.records.forEach((record) => {
      warnings.push({
        rowNumber: record.rowNumber,
        field: "duplicate",
        message: `Posible duplicado por ${group.type} ${group.value}. Filas relacionadas: ${relatedRows}.`,
        raw: record.raw,
        transformed: record.transformed
      });
    });
  });
}

function prepareMoodleRows(rows, mapping, options = {}) {
  const processedRows = [];
  const errors = [];
  const warnings = [];
  const records = [];

  rows.forEach((sourceRow, index) => {
    const rowNumber = index + 2;
    const transformed = transformRowWithMapping(sourceRow, mapping, options);
    const validation = validationService.validateMoodleRow(
      transformed.row,
      transformed.meta,
      {
        emailRequired: options.emailRequired !== false
      }
    );

    const rowWarnings = [
      ...transformed.warnings,
      ...validation.warnings
    ];

    records.push({
      rowNumber,
      raw: sourceRow,
      transformed: transformed.row,
      meta: transformed.meta
    });

    validation.errors.forEach((error) => {
      errors.push({
        rowNumber,
        field: error.field,
        message: error.message,
        raw: sourceRow,
        transformed: transformed.row
      });
    });

    rowWarnings.forEach((warning) => {
      warnings.push({
        rowNumber,
        field: warning.field,
        message: warning.message,
        raw: sourceRow,
        transformed: transformed.row
      });
    });

    if (!validation.errors.length) {
      processedRows.push(transformed.row);
    }
  });

  addDuplicateWarnings(records, warnings);

  return {
    totalRows: rows.length,
    processedRows,
    errors,
    warnings
  };
}

function buildIssueRows(issues, severity) {
  return issues.map((issue) => ({
    tipo: severity,
    fila: issue.rowNumber,
    campo: issue.field,
    mensaje: issue.message,
    datos_transformados: JSON.stringify(issue.transformed || {}),
    datos_originales: JSON.stringify(issue.raw || {})
  }));
}

module.exports = {
  getMappedValue,
  normalizeEmailValue,
  splitFullName,
  transformRowWithMapping,
  prepareMoodleRows,
  buildIssueRows
};
