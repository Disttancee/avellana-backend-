// src/controllers/stories.controller.js
const { query }      = require("../config/db");
const { notifyUser } = require("../websocket");

// GET /api/stories — stories de personas que sigo (activas, últimas 24h)
async function getFeedStories(req, res) {
  try {
    const result = await query(
      `SELECT
          s.id, s.image_url, s.caption, s.created_at, s.expires_at,
          u.id          AS author_id,
          u.name        AS author_name,
          u.username    AS author_username,
          u.avatar_url  AS author_avatar,
          COUNT(sv.viewer_id)                          AS views_count,
          BOOL_OR(sv.viewer_id = $1)                   AS seen_by_me
       FROM stories s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN story_views sv ON sv.story_id = s.id
       WHERE s.expires_at > NOW()
         AND (
           s.author_id = $1
           OR s.author_id IN (
             SELECT following_id FROM follows WHERE follower_id = $1
           )
         )
       GROUP BY s.id, u.id
       ORDER BY
         CASE WHEN s.author_id = $1 THEN 0 ELSE 1 END,
         seen_by_me ASC,
         s.created_at DESC`,
      [req.user.id]
    );

    // Agrupar por autor para el carrusel de stories
    const byAuthor = {};
    result.rows.forEach(story => {
      if (!byAuthor[story.author_id]) {
        byAuthor[story.author_id] = {
          author_id:       story.author_id,
          author_name:     story.author_name,
          author_username: story.author_username,
          author_avatar:   story.author_avatar,
          all_seen:        true,
          stories:         []
        };
      }
      byAuthor[story.author_id].stories.push(story);
      if (!story.seen_by_me) byAuthor[story.author_id].all_seen = false;
    });

    res.json({ stories: Object.values(byAuthor) });
  } catch (err) {
    console.error("getFeedStories:", err);
    res.status(500).json({ error: "Error al obtener stories" });
  }
}

// GET /api/stories/my — mis propias stories
async function getMyStories(req, res) {
  try {
    const result = await query(
      `SELECT s.id, s.image_url, s.caption, s.created_at, s.expires_at,
              COUNT(sv.viewer_id) AS views_count
       FROM stories s
       LEFT JOIN story_views sv ON sv.story_id = s.id
       WHERE s.author_id = $1 AND s.expires_at > NOW()
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ stories: result.rows });
  } catch (err) {
    console.error("getMyStories:", err);
    res.status(500).json({ error: "Error al obtener tus stories" });
  }
}

// POST /api/stories — crear story con imagen
async function createStory(req, res) {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Se requiere una imagen" });

    const { caption = "" } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;

    const result = await query(
      `INSERT INTO stories (author_id, image_url, caption)
       VALUES ($1, $2, $3)
       RETURNING id, image_url, caption, created_at, expires_at`,
      [req.user.id, imageUrl, caption.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createStory:", err);
    res.status(500).json({ error: "Error al crear story" });
  }
}

// POST /api/stories/:id/view — registrar que la vi
async function viewStory(req, res) {
  try {
    const { id } = req.params;

    // Verificar que la story existe y no expiró
    const storyRes = await query(
      "SELECT id, author_id FROM stories WHERE id = $1 AND expires_at > NOW()",
      [id]
    );
    if (!storyRes.rows[0])
      return res.status(404).json({ error: "Story no encontrada o expirada" });

    // Registrar vista (ON CONFLICT no hace nada si ya la vi)
    await query(
      `INSERT INTO story_views (story_id, viewer_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, req.user.id]
    );

    // Notificar al autor via WS (solo si no soy yo)
    const authorId = storyRes.rows[0].author_id;
    if (authorId !== req.user.id) {
      notifyUser(authorId, {
        type:        "story_viewed",
        story_id:    id,
        viewer_id:   req.user.id,
        viewer_name: req.user.username
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("viewStory:", err);
    res.status(500).json({ error: "Error al registrar vista" });
  }
}

// GET /api/stories/:id/views — quiénes vieron mi story
async function getStoryViews(req, res) {
  try {
    const { id } = req.params;

    // Solo el autor puede ver quién la vio
    const storyRes = await query(
      "SELECT author_id FROM stories WHERE id = $1",
      [id]
    );
    if (!storyRes.rows[0])
      return res.status(404).json({ error: "Story no encontrada" });
    if (storyRes.rows[0].author_id !== req.user.id)
      return res.status(403).json({ error: "No autorizado" });

    const result = await query(
      `SELECT u.id, u.name, u.username, u.avatar_url, sv.viewed_at
       FROM story_views sv
       JOIN users u ON u.id = sv.viewer_id
       WHERE sv.story_id = $1
       ORDER BY sv.viewed_at DESC`,
      [id]
    );

    res.json({ views: result.rows });
  } catch (err) {
    console.error("getStoryViews:", err);
    res.status(500).json({ error: "Error al obtener vistas" });
  }
}

// DELETE /api/stories/:id — eliminar mi story
async function deleteStory(req, res) {
  try {
    const result = await query(
      "DELETE FROM stories WHERE id = $1 AND author_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Story no encontrada o no autorizado" });

    res.json({ deleted: true });
  } catch (err) {
    console.error("deleteStory:", err);
    res.status(500).json({ error: "Error al eliminar story" });
  }
}

module.exports = {
  getFeedStories, getMyStories, createStory,
  viewStory, getStoryViews, deleteStory
};
