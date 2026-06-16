// src/controllers/messages.controller.js
const { query } = require("../config/db");

// GET /api/messages/conversations — últimas conversaciones
async function getConversations(req, res) {
  try {
    const result = await query(
      `SELECT DISTINCT ON (other_id)
              other_id,
              body AS last_message,
              created_at,
              unread_count
       FROM (
         SELECT
           CASE WHEN from_id = $1 THEN to_id ELSE from_id END AS other_id,
           body,
           created_at,
           (SELECT COUNT(*) FROM messages
            WHERE to_id = $1
              AND from_id = CASE WHEN m.from_id = $1 THEN m.to_id ELSE m.from_id END
              AND read = FALSE) AS unread_count
         FROM messages m
         WHERE from_id = $1 OR to_id = $1
         ORDER BY created_at DESC
       ) sub
       ORDER BY other_id, created_at DESC`,
      [req.user.id]
    );

    // Obtener datos de los usuarios
    const convs = await Promise.all(
      result.rows.map(async (row) => {
        const u = await query(
          "SELECT id, name, username, avatar_url FROM users WHERE id = $1",
          [row.other_id]
        );
        return {
          user:         u.rows[0],
          last_message: row.last_message,
          unread:       parseInt(row.unread_count) || 0,
          created_at:   row.created_at
        };
      })
    );

    res.json({ conversations: convs });
  } catch (err) {
    console.error("getConversations:", err);
    res.status(500).json({ error: "Error al obtener conversaciones" });
  }
}

// GET /api/messages/:userId — historial con un usuario
async function getHistory(req, res) {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT id, from_id, to_id, body, read, created_at
       FROM messages
       WHERE (from_id = $1 AND to_id = $2)
          OR (from_id = $2 AND to_id = $1)
       ORDER BY created_at ASC
       LIMIT 100`,
      [req.user.id, userId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error("getHistory:", err);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
}

module.exports = { getConversations, getHistory };
