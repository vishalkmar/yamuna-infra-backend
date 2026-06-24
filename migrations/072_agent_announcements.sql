-- =========================================================================
-- Agent Management System — Module 5.4: Announcements & News Feed
--   • agent_announcements — persistent company news board for agents (distinct
--     from per-agent broadcasts in 5.1). Pinned items float to the top.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_announcements (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(180)    NOT NULL,
  body        TEXT            NULL,
  image_url   VARCHAR(500)    NULL,
  is_pinned   TINYINT(1)      NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_by  VARCHAR(120)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_active (is_active, is_pinned)
) ENGINE=InnoDB;
