const { randomUUID } = require("crypto");
const { query } = require("../config/database");

async function createUploadedFile({
  id = randomUUID(),
  originalName,
  storedName,
  sheetName,
  uploadedBy,
  totalRows
}) {
  await query(
    `INSERT INTO uploaded_files
      (id, original_name, stored_name, sheet_name, uploaded_by, total_rows)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, originalName, storedName, sheetName, uploadedBy, totalRows]
  );

  return id;
}

async function findUploadedFile(id) {
  const rows = await query(
    "SELECT * FROM uploaded_files WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] || null;
}

async function createProcessHistory({
  uploadedFileId,
  userId,
  outputFile,
  errorReportFile,
  processedCount,
  errorCount
}) {
  const id = randomUUID();

  await query(
    `INSERT INTO process_history
      (id, uploaded_file_id, user_id, output_file, error_report_file, processed_count, error_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      uploadedFileId,
      userId,
      outputFile,
      errorReportFile,
      processedCount,
      errorCount
    ]
  );

  return id;
}

async function createProcessErrors(historyId, errors) {
  if (!errors.length) {
    return;
  }

  const values = errors.map((error) => [
    randomUUID(),
    historyId,
    error.rowNumber,
    error.field,
    error.message,
    JSON.stringify(error.raw || {})
  ]);

  const placeholders = values.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");

  await query(
    `INSERT INTO process_errors
      (id, history_id, excel_row_number, field_name, message, raw_data)
     VALUES ${placeholders}`,
    values.flat()
  );
}

async function listHistory() {
  return query(
    `SELECT
       ph.id,
       uf.original_name,
       u.email AS uploaded_by,
       ph.processed_count,
       ph.error_count,
       ph.output_file,
       ph.error_report_file,
       ph.created_at
     FROM process_history ph
     LEFT JOIN uploaded_files uf ON uf.id = ph.uploaded_file_id
     LEFT JOIN users u ON u.id = ph.user_id
     ORDER BY ph.created_at DESC
     LIMIT 50`
  );
}

module.exports = {
  createUploadedFile,
  findUploadedFile,
  createProcessHistory,
  createProcessErrors,
  listHistory
};
