// src/controllers/notifications.controller.js
const { query } = require("../config/db");

// GET /api/notifications
async function getNotifications(req, res) {
  try {
    const result = await query(
      `SELECT n.id, n.type, n.read, n.created_at,
              n.post_id,
              u.id AS from_id, u.name AS from_name,
              u.username AS from_username, u.avatar_url AS from_avatar
       FROM notifications n
       LEFT JOIN users u ON u.id = n.from_id
       WHERE n.to_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error("getNotifications:", err);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  try {
    await query(
      "UPDATE notifications SET read = TRUE WHERE to_id = $1",
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("markAllRead:", err);
    res.status(500).json({ error: "Error al marcar notificaciones" });
  }
}

// PATCH /api/notifications/:id/read
async function markOneRead(req, res) {
  try {
    await query(
      "UPDATE notifications SET read = TRUE WHERE id = $1 AND to_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("markOneRead:", err);
    res.status(500).json({ error: "Error al marcar notificación" });
  }
}

module.exports = { getNotifications, markAllRead, markOneRead };
