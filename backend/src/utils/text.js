function squeezeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function removeOddCharacters(value) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\p{L}\p{N}\s@._+\-]/gu, "");
}

function capitalizeText(value) {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
        .join("-")
    )
    .join(" ");
}

function normalizeText(value, options = {}) {
  const mode = options.mode || "none";
  const shouldRemoveOddCharacters = Boolean(options.removeOddCharacters);

  let normalized = squeezeSpaces(value);

  if (shouldRemoveOddCharacters) {
    normalized = removeOddCharacters(normalized);
    normalized = squeezeSpaces(normalized);
  }

  if (mode === "lower") {
    return normalized.toLowerCase();
  }

  if (mode === "upper") {
    return normalized.toUpperCase();
  }

  if (mode === "capitalize") {
    return capitalizeText(normalized);
  }

  return normalized;
}

module.exports = {
  squeezeSpaces,
  removeOddCharacters,
  capitalizeText,
  normalizeText
};
