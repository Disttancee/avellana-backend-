// src/controllers/users.controller.js
const { query } = require("../config/db");

// GET /api/users/:username
async function getProfile(req, res) {
  try {
    const { username } = req.params;
    const result = await query(
      `SELECT id, name, username, bio, location, website,
              avatar_url, cover_url, followers, following, posts_count, created_at
       FROM users WHERE username = $1`,
      [username.toLowerCase()]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Usuario no encontrado" });

    // ¿Lo sigo yo?
    const followCheck = await query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.user.id, result.rows[0].id]
    );

    res.json({ ...result.rows[0], following_by_me: followCheck.rows.length > 0 });
  } catch (err) {
    console.error("getProfile:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
}

// PUT /api/users/me
async function updateProfile(req, res) {
  try {
    const { name, bio, location, website } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    let   idx    = 1;

    if (name)      { fields.push(`name = $${idx++}`);       values.push(name); }
    if (bio  !== undefined) { fields.push(`bio = $${idx++}`); values.push(bio); }
    if (location !== undefined) { fields.push(`location = $${idx++}`); values.push(location); }
    if (website  !== undefined) { fields.push(`website = $${idx++}`);  values.push(website); }
    if (avatarUrl) { fields.push(`avatar_url = $${idx++}`); values.push(avatarUrl); }

    if (fields.length === 0)
      return res.status(400).json({ error: "Sin campos para actualizar" });

    values.push(req.user.id);
    const result = await query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, name, username, bio, location, website, avatar_url, cover_url`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateProfile:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
}

// POST /api/users/:username/follow
async function followUser(req, res) {
  try {
    const target = await query("SELECT id FROM users WHERE username = $1", [req.params.username]);
    if (!target.rows[0]) return res.status(404).json({ error: "Usuario no encontrado" });

    const targetId = target.rows[0].id;
    if (targetId === req.user.id)
      return res.status(400).json({ error: "No puedes seguirte a ti mismo" });

    // ¿Ya lo sigo?
    const existing = await query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.user.id, targetId]
    );

    if (existing.rows.length > 0) {
      // Dejar de seguir
      await query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [req.user.id, targetId]);
      await query("UPDATE users SET following = GREATEST(following - 1, 0) WHERE id = $1", [req.user.id]);
      await query("UPDATE users SET followers = GREATEST(followers - 1, 0) WHERE id = $1", [targetId]);
      return res.json({ following: false });
    } else {
      // Seguir
      await query("INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)", [req.user.id, targetId]);
      await query("UPDATE users SET following = following + 1 WHERE id = $1", [req.user.id]);
      await query("UPDATE users SET followers = followers + 1 WHERE id = $1", [targetId]);

      // Notificación
      await query(
        "INSERT INTO notifications (to_id, from_id, type) VALUES ($1, $2, 'follow')",
        [targetId, req.user.id]
      );

      return res.json({ following: true });
    }
  } catch (err) {
    console.error("followUser:", err);
    res.status(500).json({ error: "Error al procesar seguir" });
  }
}

// GET /api/users/search?q=term
async function searchUsers(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return res.status(400).json({ error: "Mínimo 2 caracteres para buscar" });

    const term   = `%${q.toLowerCase().replace("@", "")}%`;
    const result = await query(
      `SELECT id, name, username, bio, avatar_url, followers
       FROM users
       WHERE username ILIKE $1 OR name ILIKE $1
       ORDER BY followers DESC
       LIMIT 20`,
      [term]
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error("searchUsers:", err);
    res.status(500).json({ error: "Error en la búsqueda" });
  }
}

// GET /api/users/suggested
async function suggestedUsers(req, res) {
  try {
    const result = await query(
      `SELECT id, name, username, bio, avatar_url, followers
       FROM users
       WHERE id != $1
         AND id NOT IN (
           SELECT following_id FROM follows WHERE follower_id = $1
         )
       ORDER BY followers DESC
       LIMIT 6`,
      [req.user.id]
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("suggestedUsers:", err);
    res.status(500).json({ error: "Error al obtener sugerencias" });
  }
}

module.exports = { getProfile, updateProfile, followUser, searchUsers, suggestedUsers };
