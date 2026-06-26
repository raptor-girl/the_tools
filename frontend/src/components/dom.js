export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function setMessage(element, message, type = "info") {
  element.textContent = message || "";
  element.dataset.type = type;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderTable(container, rows, emptyMessage = "Sin datos para mostrar.") {
  if (!rows || !rows.length) {
    container.innerHTML = `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  const headers = Object.keys(rows[0]);
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = headers
        .map((header) => `<td>${escapeHtml(row[header])}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  container.innerHTML = `
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

export function setLoading(button, isLoading, loadingText = "Procesando...") {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}
