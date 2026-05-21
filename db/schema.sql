-- LeetNode D1 Database Schema
-- Apply with: npx wrangler d1 execute leetnode --file=db/schema.sql

-- ── Feedback ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  page       TEXT    NOT NULL DEFAULT 'unknown',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  read       INTEGER NOT NULL DEFAULT 0   -- 0 = unread, 1 = read
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_read    ON feedback (read);

-- ── Future: persistent leaderboard ───────────────────────────────────────────
-- Uncomment when auth ships
-- CREATE TABLE IF NOT EXISTS users (
--   id         TEXT    PRIMARY KEY,  -- uuid
--   handle     TEXT    NOT NULL UNIQUE,
--   email      TEXT    NOT NULL UNIQUE,
--   created_at TEXT    NOT NULL DEFAULT (datetime('now'))
-- );
--
-- CREATE TABLE IF NOT EXISTS solves (
--   id          INTEGER PRIMARY KEY AUTOINCREMENT,
--   user_id     TEXT    NOT NULL REFERENCES users(id),
--   problem_slug TEXT   NOT NULL,
--   difficulty  TEXT    NOT NULL,
--   solve_time_s INTEGER NOT NULL,  -- seconds to solve
--   score       INTEGER NOT NULL,
--   solved_at   TEXT    NOT NULL DEFAULT (datetime('now'))
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_solves_user    ON solves (user_id);
-- CREATE INDEX IF NOT EXISTS idx_solves_problem ON solves (problem_slug);
