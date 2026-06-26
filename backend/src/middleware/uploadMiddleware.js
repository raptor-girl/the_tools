const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const Busboy = require("busboy");
const fileStorage = require("../services/fileStorageService");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

function parseExcelUpload(req, res, next) {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return res.status(400).json({
      ok: false,
      message: "La solicitud debe ser multipart/form-data."
    });
  }

  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1
    }
  });

  let uploadError = null;
  let savedFile = null;
  let writeDone = Promise.resolve();

  busboy.on("file", (fieldName, file, info) => {
    if (fieldName !== "file") {
      file.resume();
      return;
    }

    const originalName = info.filename || "archivo.xlsx";
    const extension = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      uploadError = new Error("Solo se permiten archivos .xlsx o .xls.");
      file.resume();
      return;
    }

    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const fullPath = path.join(fileStorage.resolveUploadsDir(), filename);
    const writeStream = fs.createWriteStream(fullPath);

    savedFile = {
      originalname: originalName,
      filename,
      path: fullPath
    };

    file.on("limit", () => {
      uploadError = new Error("El archivo supera el maximo permitido de 20 MB.");
      writeStream.destroy();
      fs.unlink(fullPath, () => {});
    });

    file.on("error", (error) => {
      uploadError = error;
    });

    writeStream.on("error", (error) => {
      uploadError = error;
    });

    writeDone = new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    file.pipe(writeStream);
  });

  busboy.on("error", next);

  busboy.on("finish", async () => {
    try {
      await writeDone;
    } catch (error) {
      return next(error);
    }

    if (uploadError) {
      return res.status(400).json({
        ok: false,
        message: uploadError.message
      });
    }

    if (!savedFile) {
      return res.status(400).json({
        ok: false,
        message: "Debes subir un archivo .xlsx o .xls."
      });
    }

    req.file = savedFile;
    return next();
  });

  return req.pipe(busboy);
}

module.exports = {
  parseExcelUpload
};
