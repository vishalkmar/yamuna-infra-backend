-- =========================================================================
-- Agent Management System — Module 3.1: Site Visit Scheduling
--   • agent_site_visits — an agent schedules a buyer visit for a lead (project /
--     optional unit, date-time, slot). status drives confirmation (3.2) and
--     check-in / outcome (3.3). Columns for those are added now to avoid churn.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_site_visits (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id         BIGINT UNSIGNED NOT NULL,
  agent_id        BIGINT UNSIGNED NULL,
  project_id      BIGINT UNSIGNED NULL,
  unit_id         BIGINT UNSIGNED NULL,
  scheduled_at    DATETIME        NOT NULL,
  slot            VARCHAR(40)     NULL,
  status          ENUM('requested','confirmed','completed','no_show','cancelled') NOT NULL DEFAULT 'requested',
  checked_in_at   DATETIME        NULL,            -- Module 3.3
  outcome         VARCHAR(300)    NULL,            -- Module 3.3
  feedback        VARCHAR(500)    NULL,            -- Module 3.3
  notes           VARCHAR(500)    NULL,
  created_by_type ENUM('agent','admin') NOT NULL,
  created_by_name VARCHAR(120)    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_visits_lead (lead_id),
  KEY idx_visits_agent (agent_id),
  KEY idx_visits_status (status),
  KEY idx_visits_when (scheduled_at),
  CONSTRAINT fk_visits_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
  CONSTRAINT fk_visits_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL,
  CONSTRAINT fk_visits_project FOREIGN KEY (project_id) REFERENCES agent_projects (id) ON DELETE SET NULL,
  CONSTRAINT fk_visits_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE SET NULL
) ENGINE=InnoDB;
