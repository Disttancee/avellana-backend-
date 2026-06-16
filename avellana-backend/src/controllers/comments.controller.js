// src/controllers/comments.controller.js
const { query }       = require("../config/db");
const { notifyUser }  = require("../websocket");

// GET /api/posts/:id/comments
async function getComments(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.id, c.body, c.created_at,
              u.id AS author_id, u.name AS author_name,
              u.username AS author_username, u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error("getComments:", err);
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
}

// POST /api/posts/:id/comments
async function addComment(req, res) {
  try {
    const { id }   = req.params;
    const { body } = req.body;

    if (!body?.trim())
      return res.status(400).json({ error: "El comentario no puede estar vacío" });

    // Insertar comentario
    const result = await query(
      `INSERT INTO comments (post_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [id, req.user.id, body.trim()]
    );
    const comment = result.rows[0];

    // Actualizar contador en el post
    await query(
      "UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1",
      [id]
    );

    // Obtener datos del autor para la respuesta
    const authorResult = await query(
      "SELECT id, name, username, avatar_url FROM users WHERE id = $1",
      [req.user.id]
    );
    const author = authorResult.rows[0];

    const fullComment = {
      ...comment,
      author_id:       author.id,
      author_name:     author.name,
      author_username: author.username,
      author_avatar:   author.avatar_url
    };

    // Notificar al autor del post via WebSocket (si no es el mismo)
    const postResult = await query("SELECT author_id FROM posts WHERE id = $1", [id]);
    const postAuthorId = postResult.rows[0]?.author_id;

    if (postAuthorId && postAuthorId !== req.user.id) {
      // Guardar notificación en BD
      await query(
        "INSERT INTO notifications (to_id, from_id, type, post_id) VALUES ($1, $2, 'comment', $3)",
        [postAuthorId, req.user.id, id]
      );
      // Enviar por WebSocket si está conectado
      notifyUser(postAuthorId, {
        type:      "new_notification",
        notifType: "comment",
        from_name: author.name,
        post_id:   id
      });
    }

    res.status(201).json(fullComment);
  } catch (err) {
    console.error("addComment:", err);
    res.status(500).json({ error: "Error al agregar comentario" });
  }
}

// DELETE /api/posts/:id/comments/:commentId
async function deleteComment(req, res) {
  try {
    const { id, commentId } = req.params;

    const result = await query(
      "DELETE FROM comments WHERE id = $1 AND author_id = $2 RETURNING id",
      [commentId, req.user.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Comentario no encontrado o no autorizado" });

    // Decrementar contador
    await query(
      "UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1",
      [id]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error("deleteComment:", err);
    res.status(500).json({ error: "Error al eliminar comentario" });
  }
}

module.exports = { getComments, addComment, deleteComment };
