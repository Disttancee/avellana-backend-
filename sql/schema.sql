-- ═══════════════════════════════════════════════
--  Avellana — Schema PostgreSQL
--  Ejecutar: psql -U postgres -d avellana -f schema.sql
-- ═══════════════════════════════════════════════

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabla: users ──────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(80) NOT NULL,
  username     VARCHAR(30) NOT NULL UNIQUE,
  email        VARCHAR(120)NOT NULL UNIQUE,
  password     VARCHAR(255)NOT NULL,
  bio          TEXT        DEFAULT '',
  location     VARCHAR(80) DEFAULT '',
  website      VARCHAR(120)DEFAULT '',
  avatar_url   TEXT        DEFAULT '',
  cover_url    TEXT        DEFAULT '',
  followers    INT         DEFAULT 0,
  following    INT         DEFAULT 0,
  posts_count  INT         DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: posts ──────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT        NOT NULL,
  image_url     TEXT        DEFAULT '',
  likes_count   INT         DEFAULT 0,
  comments_count INT        DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: likes ──────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ── Tabla: comments ───────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: follows ────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- ── Tabla: messages ───────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  read        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: notifications ──────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  type        VARCHAR(20) NOT NULL, -- 'like' | 'comment' | 'follow' | 'mention'
  post_id     UUID        REFERENCES posts(id) ON DELETE CASCADE,
  read        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices para performance ───────────────────
CREATE INDEX IF NOT EXISTS idx_posts_author    ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created   ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_from   ON messages(from_id);
CREATE INDEX IF NOT EXISTS idx_messages_to     ON messages(to_id);
CREATE INDEX IF NOT EXISTS idx_notif_to        ON notifications(to_id);
CREATE INDEX IF NOT EXISTS idx_users_username  ON users(username);

-- ── Vista: feed con datos del autor ───────────
CREATE OR REPLACE VIEW posts_with_author AS
  SELECT
    p.id, p.body, p.image_url, p.likes_count,
    p.comments_count, p.created_at,
    u.id          AS author_id,
    u.name        AS author_name,
    u.username    AS author_username,
    u.avatar_url  AS author_avatar
  FROM posts p
  JOIN users u ON u.id = p.author_id
  ORDER BY p.created_at DESC;

-- ── Tabla: stories ────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  caption     TEXT        DEFAULT '',
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: story_views ────────────────────────
CREATE TABLE IF NOT EXISTS story_views (
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id  UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_stories_author   ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires  ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
