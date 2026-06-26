function cleanRutValue(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, "")
    .replace(/[^0-9K]/g, "");
}

function calculateRutVerifier(body) {
  let multiplier = 2;
  let sum = 0;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) {
    return "0";
  }

  if (remainder === 10) {
    return "K";
  }

  return String(remainder);
}

function formatRut(value) {
  const cleaned = cleanRutValue(value);

  if (cleaned.length < 2) {
    return {
      value: "",
      valid: false,
      error: "El RUT debe incluir cuerpo y digito verificador."
    };
  }

  const body = cleaned.slice(0, -1);
  const verifier = cleaned.slice(-1);

  if (!/^\d+$/.test(body) || !/^[0-9K]$/.test(verifier)) {
    return {
      value: `${body}-${verifier}`,
      valid: false,
      error: "El cuerpo debe ser numerico y el digito verificador debe ser numero o K."
    };
  }

  const expectedVerifier = calculateRutVerifier(body);
  const formatted = `${body}-${verifier}`;

  return {
    value: formatted,
    valid: verifier === expectedVerifier,
    error:
      verifier === expectedVerifier
        ? null
        : `Digito verificador invalido. Se esperaba ${expectedVerifier}.`
  };
}

module.exports = {
  cleanRutValue,
  calculateRutVerifier,
  formatRut
};
