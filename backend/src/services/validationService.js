function validateEmail(email) {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateMoodleRow(row, meta = {}, options = {}) {
  const errors = [];
  const warnings = [];
  const emailRequired = options.emailRequired !== false;

  if (!meta.rutValid) {
    errors.push({
      field: "rut",
      message: meta.rutError || "RUT vacio o invalido"
    });
  }

  if (!row.firstname) {
    errors.push({
      field: "firstname",
      message: "Nombre faltante"
    });
  }

  if (emailRequired && !row.email) {
    errors.push({
      field: "email",
      message: "Correo vacio"
    });
  } else if (row.email && !validateEmail(row.email)) {
    errors.push({
      field: "email",
      message: "Correo invalido"
    });
  }

  if (!row.lastname) {
    warnings.push({
      field: "lastname",
      message: "Apellido no detectado"
    });
  }

  return {
    errors,
    warnings
  };
}

module.exports = {
  validateEmail,
  validateMoodleRow
};
