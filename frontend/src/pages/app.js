import { api } from "../services/api.js";
import { escapeHtml, qs, qsa, renderTable, setLoading, setMessage } from "../components/dom.js";

const mappingFields = [
  { field: "rut", label: "RUT / RUN", required: true },
  { field: "firstname", label: "Nombre", required: true },
  { field: "lastname", label: "Apellido", required: false },
  { field: "fullname", label: "Nombre completo", required: false },
  { field: "email", label: "Correo", required: true },
  { field: "course", label: "Curso", required: false }
];

const state = {
  user: null,
  upload: null,
  rutUpload: null,
  textUpload: null,
  mappings: [],
  processResult: null,
  isProcessing: false,
  secondaryLoaded: false
};

function showView(isAuthenticated) {
  qs("#loginView").hidden = isAuthenticated;
  qs("#appView").hidden = !isAuthenticated;
}

function showTool(toolName) {
  qsa(".tool-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tool === toolName);
  });
  qsa(".tool-section").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.toolPanel === toolName);
  });
}

function setStep(stepNumber) {
  qsa(".step").forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.step) === stepNumber);
  });
  qsa(".wizard-panel").forEach((panel) => {
    panel.hidden = Number(panel.dataset.panel) !== stepNumber;
  });
}

async function goToStep(stepNumber) {
  setStep(stepNumber);

  if (stepNumber === 4) {
    await processCurrentUpload();
  }
}

function renderUser() {
  qs("#currentUser").textContent = `${state.user.name} - ${state.user.role}`;
}

function profileFor(header, upload = state.upload) {
  return upload?.columnProfiles?.find((profile) => profile.header === header) || null;
}

function previewText(header, upload = state.upload) {
  const profile = profileFor(header, upload);
  const preview = profile?.preview || [];

  return preview.length ? preview.join(", ") : "Sin datos visibles";
}

function renderHeaders() {
  const headers = state.upload?.headers || [];

  qs("#headersList").innerHTML = headers
    .map((header) => `<span class="chip">${escapeHtml(header)}</span>`)
    .join("");
}

function renderColumnProfiles() {
  const profiles = state.upload?.columnProfiles || [];

  qs("#columnProfileList").innerHTML = profiles
    .map(
      (profile) => `
        <article class="column-profile">
          <strong>${escapeHtml(profile.header)}</strong>
          <span>${escapeHtml(previewText(profile.header))}</span>
        </article>
      `
    )
    .join("");
}

function renderSheetSelect(selector, upload) {
  const sheetSelect = qs(selector);
  const sheetNames = upload?.sheetNames || [];

  sheetSelect.innerHTML = sheetNames
    .map((sheetName) => {
      const selected = sheetName === upload.selectedSheet ? "selected" : "";
      return `<option value="${escapeHtml(sheetName)}" ${selected}>${escapeHtml(sheetName)}</option>`;
    })
    .join("");
}

function columnOptions(upload, selectedColumn = "") {
  return [
    `<option value="">Seleccionar columna</option>`,
    ...(upload?.headers || []).map((header) => {
      const selected = selectedColumn === header ? "selected" : "";
      const label = `${header} - ${previewText(header, upload)}`.slice(0, 120);

      return `<option value="${escapeHtml(header)}" ${selected}>${escapeHtml(label)}</option>`;
    })
  ].join("");
}

function updateMappingPreviews() {
  mappingFields.forEach(({ field }) => {
    const select = qs(`[name="${field}"]`, qs("#mappingForm"));
    const preview = qs(`[data-preview-for="${field}"]`, qs("#mappingForm"));

    if (select && preview) {
      preview.textContent = select.value ? previewText(select.value) : "Sin columna seleccionada";
    }
  });
}

function renderMappingForm() {
  const detectedMapping = state.upload?.detectedMapping || {};

  qs("#mappingForm").innerHTML = mappingFields
    .map(({ field, label, required }) => {
      const selectedColumn = detectedMapping[field] || "";

      return `
        <label class="mapping-card">
          <span>${escapeHtml(label)}${required ? " *" : ""}</span>
          <select name="${field}">
            ${columnOptions(state.upload, selectedColumn)}
          </select>
          <small data-preview-for="${field}">${escapeHtml(
            selectedColumn ? previewText(selectedColumn) : "Sin columna seleccionada"
          )}</small>
        </label>
      `;
    })
    .join("");

  const missing = state.upload?.missingMapping || [];
  setMessage(
    qs("#mappingMessage"),
    missing.length
      ? `Revisa manualmente: ${missing.join(", ")}. Puedes usar columnas __EMPTY si contienen datos correctos.`
      : "Mapeo inicial listo. Revisa las vistas previas antes de validar.",
    missing.length ? "warning" : "success"
  );
}

function renderMappingPresets() {
  qs("#mappingPreset").innerHTML = [
    `<option value="">Usar mapeo guardado</option>`,
    ...state.mappings.map(
      (mapping) => `<option value="${escapeHtml(mapping.id)}">${escapeHtml(mapping.name)}</option>`
    )
  ].join("");
}

function applyMappingPreset(mappingId) {
  const preset = state.mappings.find((mapping) => mapping.id === mappingId);

  if (!preset) {
    return;
  }

  const presetMapping =
    typeof preset.mapping === "string" ? JSON.parse(preset.mapping) : preset.mapping;

  Object.entries(presetMapping || {}).forEach(([field, column]) => {
    const select = qs(`[name="${field}"]`, qs("#mappingForm"));

    if (select) {
      select.value = column || "";
    }
  });

  updateMappingPreviews();
}

function renderUploadData() {
  renderSheetSelect("#sheetSelect", state.upload);
  renderHeaders();
  renderColumnProfiles();
  renderTable(qs("#previewTable"), state.upload.preview, "La hoja no tiene filas.");
  renderMappingForm();
  renderMappingPresets();
}

function getMappingFromForm() {
  const form = new FormData(qs("#mappingForm"));
  const mapping = {};

  mappingFields.forEach(({ field }) => {
    mapping[field] = form.get(field) || "";
  });

  return mapping;
}

function renderDownloadLink(container, result, label = "Descargar Excel") {
  const url = api.fileUrl(result.downloadUrl);

  container.innerHTML = `
    <div class="download-buttons">
      <a class="primary-button" href="${url}">${escapeHtml(label)}</a>
    </div>
  `;

  if (result.preview) {
    const table = document.createElement("div");
    table.className = "table-wrap";
    container.appendChild(table);
    renderTable(table, result.preview, "Sin filas para mostrar.");
  }
}

function renderStats(result) {
  const warningOnlyCount = result.warnings?.length || 0;

  qs("#processStats").innerHTML = `
    <div class="summary-card"><strong>${result.totalRows}</strong><span>filas leidas</span></div>
    <div class="summary-card"><strong>${result.processedCount}</strong><span>registros validos</span></div>
    <button id="duplicateSummaryCard" class="summary-card clickable" type="button">
      <strong>${result.duplicateCount || 0}</strong><span>duplicados</span>
    </button>
    <div class="summary-card"><strong>${warningOnlyCount}</strong><span>advertencias</span></div>
  `;

  qs("#duplicateSummaryCard").addEventListener("click", () => {
    if (!result.duplicateCount) {
      qs("#duplicatesMessage").textContent = "No se detectaron duplicados.";
    }

    qs("#duplicatesSection").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function renderProcessResult() {
  const result = state.processResult;
  const downloadArea = qs("#downloadArea");

  if (!result) {
    downloadArea.innerHTML = "";
    return;
  }

  const outputUrl = api.fileUrl(result.downloadUrl);
  const reportUrl = result.errorReportUrl ? api.fileUrl(result.errorReportUrl) : null;

  downloadArea.innerHTML = `
    <h2>Descargar Excel</h2>
    <div class="download-buttons">
      <a class="primary-button" href="${outputUrl}">Descargar Excel</a>
      ${
        reportUrl
          ? `<a class="secondary-button" href="${reportUrl}">Descargar informe</a>`
          : ""
      }
    </div>
  `;
}

function duplicateRows(result) {
  return (result.duplicates || []).map((duplicate) => {
    const row = duplicate.transformed || {};
    const reason = duplicate.message?.includes("por email")
      ? "Duplicado por email"
      : "Duplicado por RUT";

    return {
      Fila: duplicate.rowNumber,
      "Username / RUT": row.username || "",
      Firstname: row.firstname || "",
      Lastname: row.lastname || "",
      Email: row.email || "",
      Motivo: reason
    };
  });
}

function showValidationOverlay(show) {
  qs("#validationOverlay").hidden = !show;
}

function clearProcessOutput() {
  state.processResult = null;
  qs("#processStats").innerHTML = "";
  qs("#processedPreview").innerHTML = "";
  qs("#duplicatesPreview").innerHTML = "";
  qs("#duplicatesMessage").textContent = "";
  setMessage(qs("#processMessage"), "");
  renderProcessResult();
}

async function processCurrentUpload() {
  if (state.isProcessing) {
    return;
  }

  if (!state.upload) {
    setMessage(qs("#processMessage"), "Primero sube un archivo.", "warning");
    return;
  }

  state.isProcessing = true;
  clearProcessOutput();
  showValidationOverlay(true);

  try {
    state.processResult = await api.processExcel({
      fileId: state.upload.fileId,
      sheetName: state.upload.selectedSheet,
      mapping: getMappingFromForm(),
      saveMappingName: qs("#mappingName").value.trim()
    });

    renderProcessResult();
    renderStats(state.processResult);
    renderTable(qs("#duplicatesPreview"), duplicateRows(state.processResult), "No se detectaron duplicados.");
    renderTable(qs("#processedPreview"), state.processResult.preview, "No se genero ningun registro valido.");
    qs("#duplicatesMessage").textContent = state.processResult.duplicateCount
      ? "Revisa posibles registros repetidos. No bloquean la descarga."
      : "No se detectaron duplicados.";
    setMessage(
      qs("#processMessage"),
      `Validos: ${state.processResult.processedCount}. Errores: ${state.processResult.errorCount}. Advertencias: ${state.processResult.warningCount}.`,
      state.processResult.errorCount ? "warning" : "success"
    );
    await loadMappings();
  } catch (error) {
    setMessage(qs("#processMessage"), error.message, "danger");
  } finally {
    state.isProcessing = false;
    showValidationOverlay(false);
  }
}

async function loadHistory() {
  try {
    const history = await api.history();
    renderTable(
      qs("#historyTable"),
      history.map((item) => ({
        archivo: item.original_name || "Sin nombre",
        registros: item.processed_count,
        errores: item.error_count,
        fecha: item.created_at
      })),
      "Sin procesos guardados."
    );
  } catch (error) {
    qs("#historyTable").innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function loadUsers() {
  try {
    const users = await api.users();
    renderTable(
      qs("#usersTable"),
      users.map((user) => ({
        nombre: user.name,
        email: user.email,
        rol: user.role,
        activo: user.is_active ? "si" : "no"
      })),
      "Sin usuarios para mostrar."
    );
  } catch (error) {
    qs("#usersTable").innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function loadMappings() {
  try {
    state.mappings = await api.mappings();
    renderMappingPresets();
  } catch (error) {
    state.mappings = [];
  }
}

async function checkApiStatus() {
  const status = qs("#apiStatus");

  try {
    const health = await api.health();
    status.textContent = health.database === "online" ? "API y MySQL online" : "API online - MySQL pendiente";
    status.dataset.type = health.database === "online" ? "success" : "warning";
  } catch (error) {
    status.textContent = "API sin conexion";
    status.dataset.type = "danger";
  }
}

async function uploadExcelFromInput(fileInput) {
  const file = fileInput.files[0];

  if (!file) {
    throw new Error("Selecciona un archivo Excel.");
  }

  const formData = new FormData();
  formData.append("file", file);

  return api.uploadExcel(formData);
}

function renderRutExcelControls() {
  renderSheetSelect("#rutSheetSelect", state.rutUpload);
  qs("#rutColumnSelect").innerHTML = columnOptions(state.rutUpload);
  qs("#rutExcelControls").hidden = false;
}

function renderTextExcelControls() {
  renderSheetSelect("#textSheetSelect", state.textUpload);
  qs("#textColumnCheckboxes").innerHTML = (state.textUpload?.headers || [])
    .map(
      (header) => `
        <label class="check-option">
          <input type="checkbox" value="${escapeHtml(header)}" />
          <span>${escapeHtml(header)}</span>
          <small>${escapeHtml(previewText(header, state.textUpload))}</small>
        </label>
      `
    )
    .join("");
  qs("#textExcelControls").hidden = false;
}

function bindEvents() {
  qsa(".tool-tab").forEach((tab) => {
    tab.addEventListener("click", () => showTool(tab.dataset.tool));
  });

  qs("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, "Entrando...");

    try {
      state.user = await api.login(qs("#loginEmail").value, qs("#loginPassword").value);
      showView(true);
      renderUser();
      await Promise.all([loadMappings(), checkApiStatus()]);
    } catch (error) {
      setMessage(qs("#loginMessage"), error.message, "danger");
    } finally {
      setLoading(button, false);
    }
  });

  qs("#logoutButton").addEventListener("click", async () => {
    await api.logout();
    state.user = null;
    showView(false);
  });

  qsa(".step").forEach((step) => {
    step.addEventListener("click", () => {
      goToStep(Number(step.dataset.step));
    });
  });

  qs("#rutBulkForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, "Normalizando...");

    try {
      const result = await api.formatRuts(qs("#rutBulkInput").value);
      renderDownloadLink(qs("#rutBulkResult"), result, "Descargar RUT normalizado");
    } catch (error) {
      qs("#rutBulkResult").innerHTML = `<p class="message" data-type="danger">${escapeHtml(error.message)}</p>`;
    } finally {
      setLoading(button, false);
    }
  });

  qs("#rutExcelUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, "Leyendo...");

    try {
      state.rutUpload = await uploadExcelFromInput(qs("#rutExcelFile"));
      renderRutExcelControls();
      qs("#rutExcelResult").innerHTML = `<p class="message" data-type="success">Excel leido. Selecciona la columna de RUT.</p>`;
    } catch (error) {
      qs("#rutExcelResult").innerHTML = `<p class="message" data-type="danger">${escapeHtml(error.message)}</p>`;
    } finally {
      setLoading(button, false);
    }
  });

  qs("#rutExcelProcessButton").addEventListener("click", async () => {
    const button = qs("#rutExcelProcessButton");
    setLoading(button, true, "Normalizando...");

    try {
      const result = await api.formatRutsExcel({
        fileId: state.rutUpload.fileId,
        sheetName: qs("#rutSheetSelect").value,
        column: qs("#rutColumnSelect").value
      });
      renderDownloadLink(qs("#rutExcelResult"), result, "Descargar Excel con RUTs");
    } catch (error) {
      qs("#rutExcelResult").innerHTML = `<p class="message" data-type="danger">${escapeHtml(error.message)}</p>`;
    } finally {
      setLoading(button, false);
    }
  });

  qs("#textToolForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, "Normalizando...");

    try {
      const result = await api.normalizeTexts(qs("#textInput").value, qs("#textMode").value);
      renderDownloadLink(qs("#textResult"), result, "Descargar textos normalizados");
    } catch (error) {
      qs("#textResult").innerHTML = `<p class="message" data-type="danger">${escapeHtml(error.message)}</p>`;
    } finally {
      setLoading(button, false);
    }
  });

  qs("#textExcelUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, "Leyendo...");

    try {
      state.textUpload = await uploadExcelFromInput(qs("#textExcelFile"));
      renderTextExcelControls();
      qs("#textExcelResult").innerHTML = `<p class="message" data-type="success">Excel leido. Selecciona una o mas columnas.</p>`;
    } catch (error) {
      qs("#textExcelResult").innerHTML = `<p class="message" data-type="danger">${escapeHtml(error.message)}</p>`;
    } finally {
      setLoading(button, false);
    }
  });

  qs("#textExcelProcessButton").addEventListener("click", async () => {
    const button = qs("#textExcelProcessButton");
    const columns = qsa("#textColumnCheckboxes input:checked").map((input) => input.value);
    setLoading(button, true, "Normalizando...");

    try {
      const result = await api.normalizeTextsExcel({
        fileId: state.textUpload.fileId,
        sheetName: qs("#textSheetSelect").value,
        columns,
        mode: qs("#textExcelMode").value,
        removeOddCharacters: true
      });
      renderDownloadLink(qs("#textExcelResult"), result, "Descargar Excel normalizado");
    } catch (error) {
      qs("#textExcelResult").innerHTML = `<p class="message" data-type="danger">${escapeHtml(error.message)}</p>`;
    } finally {
      setLoading(button, false);
    }
  });

  qs("#uploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    setLoading(button, true, "Leyendo...");

    try {
      state.upload = await uploadExcelFromInput(qs("#excelFile"));
      clearProcessOutput();
      setMessage(
        qs("#uploadMessage"),
        `Archivo leido: ${state.upload.totalRows} filas en ${state.upload.selectedSheet}.`,
        "success"
      );
      renderUploadData();
      setStep(2);
    } catch (error) {
      setMessage(qs("#uploadMessage"), error.message, "danger");
    } finally {
      setLoading(button, false);
    }
  });

  qs("#sheetSelect").addEventListener("change", async (event) => {
    if (!state.upload) {
      return;
    }

    try {
      const sheetData = await api.previewSheet(state.upload.fileId, event.target.value);
      state.upload = {
        ...state.upload,
        ...sheetData
      };
      renderUploadData();
    } catch (error) {
      setMessage(qs("#uploadMessage"), error.message, "danger");
    }
  });

  qs("#mappingForm").addEventListener("change", () => {
    updateMappingPreviews();
    clearProcessOutput();
  });
  qs("#mappingPreset").addEventListener("change", (event) => {
    applyMappingPreset(event.target.value);
    clearProcessOutput();
  });

  qs("#secondaryDetails").addEventListener("toggle", async (event) => {
    if (event.target.open && !state.secondaryLoaded) {
      state.secondaryLoaded = true;
      await Promise.all([loadHistory(), loadUsers()]);
    }
  });

  qs("#refreshHistoryButton").addEventListener("click", loadHistory);

  qs("#adminForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await api.createAdmin({
        name: qs("#adminName").value.trim(),
        email: qs("#adminEmail").value.trim(),
        password: qs("#adminPassword").value
      });
      setMessage(qs("#adminMessage"), "Administrador creado.", "success");
      event.target.reset();
      await loadUsers();
    } catch (error) {
      setMessage(qs("#adminMessage"), error.message, "danger");
    }
  });
}

async function init() {
  bindEvents();
  setStep(1);
  showTool("moodle");
  renderProcessResult();

  try {
    const user = await api.me();
    state.user = user;
    showView(Boolean(user));

    if (user) {
      renderUser();
      await Promise.all([loadMappings(), checkApiStatus()]);
    }
  } catch (error) {
    showView(false);
  }
}

init();
