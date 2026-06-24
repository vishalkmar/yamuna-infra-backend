-- =========================================================================
-- Agent Management System — Module 5.1: Notifications & Broadcast to agents
--   • agent_notification_batches — one row per admin broadcast (audience + count)
--   • agent_notifications         — per-agent fan-out rows (read tracking)
--
--   New tables → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_notification_batches (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(160)    NOT NULL,
  body        VARCHAR(1000)   NULL,
  audience    VARCHAR(40)     NOT NULL DEFAULT 'all',
  sent_count  INT             NOT NULL DEFAULT 0,
  created_by  VARCHAR(120)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent_notifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id    BIGINT UNSIGNED NOT NULL,
  batch_id    BIGINT UNSIGNED NULL,
  title       VARCHAR(160)    NOT NULL,
  body        VARCHAR(1000)   NULL,
  link        VARCHAR(255)    NULL,
  is_read     TINYINT(1)      NOT NULL DEFAULT 0,
  read_at     DATETIME        NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agent_notif_agent (agent_id, is_read),
  CONSTRAINT fk_agent_notif_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB;
