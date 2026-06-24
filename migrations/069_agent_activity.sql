-- =========================================================================
-- Agent Management System — Module 1.9: Agent Activity & Audit Log
--   • agent_activity_log — records agent-side actions (login + every successful
--     write on /api/agent/*). Admin can review an agent's activity trail.
--     (Admin-side writes are already captured by middleware/auditLog → audit_logs.)
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_activity_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id    BIGINT UNSIGNED NULL,
  action      VARCHAR(20)     NOT NULL,
  entity      VARCHAR(80)     NULL,
  entity_id   VARCHAR(20)     NULL,
  path        VARCHAR(255)    NULL,
  status_code INT             NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agent_activity_agent (agent_id, created_at),
  CONSTRAINT fk_agent_activity_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB;
