require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { testConnection } = require("./config/database");
const { requireAuth } = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const toolRoutes = require("./routes/toolRoutes");
const historyRoutes = require("./routes/historyRoutes");
const mappingRoutes = require("./routes/mappingRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const exportDir = path.resolve(process.cwd(), process.env.EXPORT_DIR || "exports");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(exportDir, { recursive: true });

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

      if (!origin || origin === allowedOrigin) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "moodle-tools-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.get("/api/health", async (req, res) => {
  try {
    await testConnection();

    return res.json({
      ok: true,
      api: "online",
      database: "online"
    });
  } catch (error) {
    return res.json({
      ok: true,
      api: "online",
      database: "offline",
      detail: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/files", requireAuth, fileRoutes);
app.use("/api/tools", requireAuth, toolRoutes);
app.use("/api/history", requireAuth, historyRoutes);
app.use("/api/mappings", requireAuth, mappingRoutes);
app.use("/api/users", requireAuth, userRoutes);

const frontendDir = path.resolve(process.cwd(), "..", "frontend");

if (fs.existsSync(path.join(frontendDir, "index.html"))) {
  app.use(express.static(frontendDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    return res.sendFile(path.join(frontendDir, "index.html"));
  });
}

app.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({
      ok: false,
      message: error.message
    });
  }

  return next();
});

module.exports = app;
