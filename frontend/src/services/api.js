const API_BASE = localStorage.getItem("moodleToolsApiBase") || "http://localhost:3001/api";

async function request(path, options = {}) {
  const init = {
    method: options.method || "GET",
    credentials: "include",
    headers: options.headers || {}
  };

  if (options.body instanceof FormData) {
    init.body = options.body;
  } else if (options.body) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { ok: response.ok };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Error de comunicacion con la API");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload;
}

function fileUrl(apiPath) {
  const apiRoot = API_BASE.replace(/\/api\/?$/, "");
  return `${apiRoot}${apiPath}`;
}

export const api = {
  API_BASE,
  fileUrl,
  health: () => request("/health"),
  me: () => request("/auth/me"),
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: { email, password }
    }),
  logout: () =>
    request("/auth/logout", {
      method: "POST"
    }),
  uploadExcel: (formData) =>
    request("/files/upload", {
      method: "POST",
      body: formData
    }),
  previewSheet: (fileId, sheetName) =>
    request("/files/preview", {
      method: "POST",
      body: { fileId, sheetName }
    }),
  processExcel: (payload) =>
    request("/files/process", {
      method: "POST",
      body: payload
    }),
  formatRut: (rut) =>
    request("/tools/format-rut", {
      method: "POST",
      body: { rut }
    }),
  formatRuts: (values) =>
    request("/tools/format-ruts", {
      method: "POST",
      body: { values }
    }),
  formatRutsExcel: (payload) =>
    request("/tools/format-ruts-excel", {
      method: "POST",
      body: payload
    }),
  normalizeText: (value, mode) =>
    request("/tools/normalize-text", {
      method: "POST",
      body: { value, mode, removeOddCharacters: true }
    }),
  normalizeTexts: (values, mode) =>
    request("/tools/normalize-texts", {
      method: "POST",
      body: { values, mode, removeOddCharacters: true }
    }),
  normalizeTextsExcel: (payload) =>
    request("/tools/normalize-texts-excel", {
      method: "POST",
      body: payload
    }),
  history: () => request("/history"),
  mappings: () => request("/mappings"),
  users: () => request("/users"),
  createAdmin: (payload) =>
    request("/users", {
      method: "POST",
      body: payload
    })
};
