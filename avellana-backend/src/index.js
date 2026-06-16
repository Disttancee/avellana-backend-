// src/index.js
require("dotenv").config();
const http    = require("http");
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const { setupWebSocket } = require("./websocket");

const app    = express();
const server = http.createServer(app); // servidor HTTP compartido con WebSocket

// ── Middlewares globales ──────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5500",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir sin origin (Postman, curl) y orígenes permitidos
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(null, true); // En producción aceptar todo por ahora
    }
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// Responder pre-flight OPTIONS
app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes subidas
app.use("/uploads", express.static(
  path.resolve(process.env.UPLOADS_PATH || "./uploads")
));

// ── Rutas REST ────────────────────────────────
app.use("/api/auth",          require("./routes/auth.routes"));
app.use("/api/posts",         require("./routes/posts.routes"));
app.use("/api/posts/:id/comments", require("./routes/comments.routes"));
app.use("/api/users",         require("./routes/users.routes"));
app.use("/api/stories",          require("./routes/stories.routes"));
app.use("/api/messages",         require("./routes/messages.routes"));
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

// ── Iniciar servidor + WebSockets ─────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🌰 Avellana API corriendo en http://localhost:${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/api/health`);
  console.log(`   WebSocket:  ws://localhost:${PORT}/ws\n`);
});

setupWebSocket(server);
