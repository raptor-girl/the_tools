const path = require("path");
const fileModel = require("../models/fileModel");

const fileRegistry = new Map();

function resolveUploadsDir() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
}

function resolveExportsDir() {
  return path.resolve(process.cwd(), process.env.EXPORT_DIR || "exports");
}

function rememberUploadedFile(fileId, fileMeta) {
  fileRegistry.set(fileId, fileMeta);
}

async function findFileMeta(fileId) {
  if (fileRegistry.has(fileId)) {
    return fileRegistry.get(fileId);
  }

  const stored = await fileModel.findUploadedFile(fileId);

  if (!stored) {
    return null;
  }

  return {
    id: stored.id,
    originalName: stored.original_name,
    storedName: stored.stored_name,
    path: path.join(resolveUploadsDir(), stored.stored_name)
  };
}

module.exports = {
  resolveUploadsDir,
  resolveExportsDir,
  rememberUploadedFile,
  findFileMeta
};
