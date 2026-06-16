// src/controllers/posts.controller.js
const { query } = require("../config/db");
const path      = require("path");

// POST /api/posts
async function createPost(req, res) {
  try {
    const { body } = req.body;
    if (!body || body.trim().length === 0)
      return res.status(400).json({ error: "El contenido no puede estar vacío" });

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    const result = await query(
      `INSERT INTO posts (author_id, body, image_url)
       VALUES ($1, $2, $3)
       RETURNING id, body, image_url, likes_count, comments_count, created_at`,
      [req.user.id, body.trim(), imageUrl]
    );

    // Actualizar contador del usuario
    await query("UPDATE users SET posts_count = posts_count + 1 WHERE id = $1", [req.user.id]);

    const post = result.rows[0];
    res.status(201).json(post);
  } catch (err) {
    console.error("createPost:", err);
    res.status(500).json({ error: "Error al crear la publicación" });
  }
}

// GET /api/posts/feed
async function getFeed(req, res) {
  try {
    const page  = parseInt(req.query.page  || "1");
    const limit = parseInt(req.query.limit || "20");
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT p.id, p.body, p.image_url, p.likes_count, p.comments_count, p.created_at,
              u.id AS author_id, u.name AS author_name,
              u.username AS author_username, u.avatar_url AS author_avatar,
              EXISTS (
                SELECT 1 FROM likes l
                WHERE l.post_id = p.id AND l.user_id = $1
              ) AS liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ posts: result.rows, page, limit });
  } catch (err) {
    console.error("getFeed:", err);
    res.status(500).json({ error: "Error al obtener el feed" });
  }
}

// GET /api/posts/user/:username
async function getUserPosts(req, res) {
  try {
    const { username } = req.params;
    const result = await query(
      `SELECT p.id, p.body, p.image_url, p.likes_count, p.comments_count, p.created_at,
              u.id AS author_id, u.name AS author_name, u.username AS author_username,
              u.avatar_url AS author_avatar
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE u.username = $1
       ORDER BY p.created_at DESC`,
      [username.toLowerCase()]
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error("getUserPosts:", err);
    res.status(500).json({ error: "Error al obtener publicaciones" });
  }
}

// POST /api/posts/:id/like
async function toggleLike(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // ¿Ya le dio like?
    const existing = await query(
      "SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2",
      [userId, id]
    );

    if (existing.rows.length > 0) {
      // Quitar like
      await query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [userId, id]);
      await query("UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1", [id]);
      return res.json({ liked: false });
    } else {
      // Dar like
      await query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [userId, id]);
      await query("UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1", [id]);

      // Notificación al autor
      const postResult = await query("SELECT author_id FROM posts WHERE id = $1", [id]);
      const authorId   = postResult.rows[0]?.author_id;
      if (authorId && authorId !== userId) {
        await query(
          "INSERT INTO notifications (to_id, from_id, type, post_id) VALUES ($1, $2, 'like', $3)",
          [authorId, userId, id]
        );
      }

      return res.json({ liked: true });
    }
  } catch (err) {
    console.error("toggleLike:", err);
    res.status(500).json({ error: "Error al procesar like" });
  }
}

// DELETE /api/posts/:id
async function deletePost(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      "DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING id",
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Publicación no encontrada o no autorizado" });

    await query("UPDATE users SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = $1", [req.user.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error("deletePost:", err);
    res.status(500).json({ error: "Error al eliminar publicación" });
  }
}

module.exports = { createPost, getFeed, getUserPosts, toggleLike, deletePost };
