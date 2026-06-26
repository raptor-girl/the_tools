const FIELD_ALIASES = {
  rut: ["rut", "r u t", "ru", "run", "identificacion", "id alumno", "documento"],
  firstname: ["nombre", "nombres", "alumno", "estudiante"],
  lastname: ["apellido", "apellidos"],
  fullname: ["nombre completo", "nombre y apellido", "nombres y apellidos"],
  email: ["email", "correo", "mail", "correo electronico"],
  course: ["curso", "nombre curso", "capacitacion", "programa"]
};

function normalizeHeader(header) {
  return String(header || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHeader(header, alias) {
  if (!header || !alias) {
    return 0;
  }

  if (header === alias) {
    return 100;
  }

  if (header.includes(alias)) {
    return 75;
  }

  if (alias.includes(header)) {
    return 55;
  }

  return 0;
}

function isUnnamedHeader(header) {
  const normalized = normalizeHeader(header);

  return (
    !normalized ||
    /^empty(?: \d+)?$/.test(normalized.replace(/^_+/, "")) ||
    /^column \d+$/.test(normalized) ||
    normalized === "sin nombre" ||
    /^__empty(?:_\d+)?$/i.test(String(header || ""))
  );
}

function firstNonEmptyValues(rows, header, limit = 5) {
  const values = [];

  for (const row of rows) {
    const value = row[header];

    if (value !== undefined && value !== null && String(value).trim()) {
      values.push(String(value).trim());
    }

    if (values.length >= limit) {
      break;
    }
  }

  return values;
}

function looksLikeEmail(value) {
  return /@/.test(String(value || ""));
}

function looksLikeRut(value) {
  return /^[0-9.\-\s]{7,12}[0-9kK]?$/.test(String(value || "").trim());
}

function looksLikeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function looksLikeText(values) {
  return values.some((value) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value));
}

function findNextUnnamedHeader(headers, startHeader, rows, usedHeaders) {
  const startIndex = headers.indexOf(startHeader);

  if (startIndex < 0) {
    return null;
  }

  return headers.slice(startIndex + 1).find((header) => {
    if (usedHeaders.has(header) || !isUnnamedHeader(header)) {
      return false;
    }

    const values = firstNonEmptyValues(rows, header);

    return (
      values.length &&
      looksLikeText(values) &&
      !values.some(looksLikeEmail) &&
      !values.some(looksLikeRut) &&
      !values.some(looksLikeDate)
    );
  });
}

function applyContentHeuristics(headers, rows, mapping, usedHeaders) {
  if (!mapping.rut) {
    const rutHeader = headers.find((header) => {
      if (usedHeaders.has(header)) {
        return false;
      }

      const normalized = normalizeHeader(header);

      if (normalized === "ru") {
        return true;
      }

      const values = firstNonEmptyValues(rows, header);
      return values.length && values.every(looksLikeRut);
    });

    if (rutHeader) {
      mapping.rut = rutHeader;
      usedHeaders.add(rutHeader);
    }
  }

  if (!mapping.lastname && mapping.firstname) {
    const lastnameHeader = findNextUnnamedHeader(
      headers,
      mapping.firstname,
      rows,
      usedHeaders
    );

    if (lastnameHeader) {
      mapping.lastname = lastnameHeader;
      usedHeaders.add(lastnameHeader);
    }
  }

  if (!mapping.course && mapping.email) {
    const courseHeader = findNextUnnamedHeader(headers, mapping.email, rows, usedHeaders);

    if (courseHeader) {
      mapping.course = courseHeader;
      usedHeaders.add(courseHeader);
    }
  }
}

function detectColumnMapping(headers, rows = []) {
  const candidates = [];

  headers.forEach((header) => {
    const normalizedHeader = normalizeHeader(header);

    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      const bestAliasScore = aliases.reduce((best, alias) => {
        return Math.max(best, scoreHeader(normalizedHeader, normalizeHeader(alias)));
      }, 0);

      if (bestAliasScore > 0) {
        candidates.push({
          field,
          header,
          score: bestAliasScore
        });
      }
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  const mapping = {};
  const usedHeaders = new Set();

  candidates.forEach((candidate) => {
    if (!mapping[candidate.field] && !usedHeaders.has(candidate.header)) {
      mapping[candidate.field] = candidate.header;
      usedHeaders.add(candidate.header);
    }
  });

  applyContentHeuristics(headers, rows, mapping, usedHeaders);

  return {
    mapping,
    missing: Object.keys(FIELD_ALIASES).filter(
      (field) => field !== "fullname" && !mapping[field]
    )
  };
}

module.exports = {
  FIELD_ALIASES,
  isUnnamedHeader,
  firstNonEmptyValues,
  normalizeHeader,
  detectColumnMapping
};
