-- =========================================================================
-- Agent Management System — Module 2.7: Follow-ups, Tasks & Reminders
--   • lead_tasks — a follow-up / to-do on a lead (call back, send brochure,
--     schedule visit…). due_at drives upcoming/overdue views. agent_id is the
--     owning agent (denormalized from the lead for fast "my tasks" queries).
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS lead_tasks (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id         BIGINT UNSIGNED NOT NULL,
  agent_id        BIGINT UNSIGNED NULL,
  title           VARCHAR(200)    NOT NULL,
  notes           VARCHAR(500)    NULL,
  due_at          DATETIME        NULL,
  is_done         TINYINT(1)      NOT NULL DEFAULT 0,
  done_at         DATETIME        NULL,
  created_by_type ENUM('agent','admin') NOT NULL,
  created_by_name VARCHAR(120)    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead_tasks_lead (lead_id),
  KEY idx_lead_tasks_agent (agent_id, is_done),
  KEY idx_lead_tasks_due (due_at),
  CONSTRAINT fk_lead_tasks_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
) ENGINE=InnoDB;
