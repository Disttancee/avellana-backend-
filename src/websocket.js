// src/websocket.js
// ─────────────────────────────────────────────────────
//  Avellana — WebSocket Server
//  Maneja mensajes en tiempo real entre usuarios.
//  Se monta sobre el mismo servidor HTTP de Express.
// ─────────────────────────────────────────────────────
const { WebSocketServer } = require("ws");
const jwt                 = require("jsonwebtoken");
const { query }           = require("./config/db");

// Map de conexiones activas: uid → WebSocket
const clients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    // ── Autenticar con el token que viene en la URL
    // El frontend conecta así: new WebSocket("wss://host/ws?token=JWT")
    const url    = new URL(req.url, "http://localhost");
    const token  = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Token requerido");
      return;
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, "Token inválido");
      return;
    }

    // Registrar la conexión
    clients.set(user.id, ws);
    console.log(`WS conectado: ${user.username} (${user.id})`);

    // Enviar mensajes no leídos al conectarse
    try {
      const unread = await query(
        `SELECT m.id, m.body, m.created_at, m.read,
                u.id AS from_id, u.name AS from_name,
                u.username AS from_username, u.avatar_url AS from_avatar
         FROM messages m
         JOIN users u ON u.id = m.from_id
         WHERE m.to_id = $1 AND m.read = FALSE
         ORDER BY m.created_at ASC`,
        [user.id]
      );
      if (unread.rows.length > 0) {
        send(ws, { type: "unread_messages", messages: unread.rows });
      }
    } catch (err) {
      console.error("Error cargando mensajes no leídos:", err);
    }

    // ── Manejar mensajes entrantes
    ws.on("message", async (raw) => {
      let data;
      try { data = JSON.parse(raw); } catch { return; }

      switch (data.type) {

        // Enviar un mensaje directo
        case "send_message": {
          const { to_id, body } = data;
          if (!to_id || !body?.trim()) return;

          try {
            // Guardar en la BD
            const result = await query(
              `INSERT INTO messages (from_id, to_id, body)
               VALUES ($1, $2, $3)
               RETURNING id, body, created_at`,
              [user.id, to_id, body.trim()]
            );
            const msg = result.rows[0];

            const payload = {
              type:         "new_message",
              id:           msg.id,
              body:         msg.body,
              created_at:   msg.created_at,
              from_id:      user.id,
              from_name:    user.username,
              from_avatar:  "",
              to_id
            };

            // Enviar al destinatario si está conectado
            const targetWs = clients.get(to_id);
            if (targetWs && targetWs.readyState === 1) {
              send(targetWs, payload);
            }

            // Confirmar al remitente
            send(ws, { ...payload, type: "message_sent" });

          } catch (err) {
            console.error("Error guardando mensaje:", err);
            send(ws, { type: "error", message: "No se pudo enviar el mensaje" });
          }
          break;
        }

        // Marcar mensajes como leídos
        case "mark_read": {
          const { from_id } = data;
          if (!from_id) return;
          try {
            await query(
              "UPDATE messages SET read = TRUE WHERE from_id = $1 AND to_id = $2",
              [from_id, user.id]
            );
            // Notificar al remitente que sus mensajes fueron leídos
            const senderWs = clients.get(from_id);
            if (senderWs && senderWs.readyState === 1) {
              send(senderWs, { type: "messages_read", by: user.id });
            }
          } catch (err) {
            console.error("Error marcando mensajes:", err);
          }
          break;
        }

        // Indicador "está escribiendo..."
        case "typing": {
          const { to_id } = data;
          if (!to_id) return;
          const targetWs = clients.get(to_id);
          if (targetWs && targetWs.readyState === 1) {
            send(targetWs, {
              type:      "typing",
              from_id:   user.id,
              from_name: user.username
            });
          }
          break;
        }
      }
    });

    // ── Limpiar al desconectar
    ws.on("close", () => {
      clients.delete(user.id);
      console.log(`WS desconectado: ${user.username}`);
    });

    ws.on("error", (err) => {
      console.error(`WS error (${user.username}):`, err);
      clients.delete(user.id);
    });
  });

  // Ping cada 30s para mantener conexiones vivas
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === 1) ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  console.log("WebSocket server activo en /ws");
  return wss;
}

// Helper para enviar JSON de forma segura
function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

// Exportar para poder notificar desde otras partes del backend
function notifyUser(uid, data) {
  const ws = clients.get(uid);
  if (ws) send(ws, data);
}

module.exports = { setupWebSocket, notifyUser };
