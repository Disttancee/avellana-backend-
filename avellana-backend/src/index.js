// src/index.js
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const app = express();

// ── Middlewares globales ──────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || "*",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes subidas como estáticos
app.use("/uploads", express.static(
  path.resolve(process.env.UPLOADS_PATH || "./uploads")
));

// ── Rutas ─────────────────────────────────────
app.use("/api/auth",          require("./routes/auth.routes"));
app.use("/api/posts",         require("./routes/posts.routes"));
app.use("/api/users",         require("./routes/users.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));

// ── Health check ──────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error handler global ──────────────────────
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(err.status || 500).json({ error: err.message || "Error interno" });
});

// ── Iniciar servidor ──────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌰 Avellana API corriendo en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
