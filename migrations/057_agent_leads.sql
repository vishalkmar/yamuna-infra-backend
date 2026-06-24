-- =========================================================================
-- Agent Management System — Module 2.3: Lead Capture & Submission
--   • leads — a buyer/enquiry an agent brings. References a project (interest)
--     and optionally a specific unit. Moves through a sales funnel via `stage`.
--   • dedupe_key / owner_lock_until — pre-added for Module 2.6 (de-dup + 90-day
--     ownership lock). assigned_admin_id — for Module 2.4 (assignment/routing).
--     last_activity_at — for Module 2.7 (follow-ups). Logic for those lands in
--     their modules; columns now to avoid churn.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS leads (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id         BIGINT UNSIGNED NULL,            -- owning agent (lead survives agent delete)
  name             VARCHAR(140)    NOT NULL,
  phone            VARCHAR(20)     NULL,
  email            VARCHAR(180)    NULL,
  source           ENUM('walk_in','referral','online','call','social','other') NOT NULL DEFAULT 'other',
  project_id       BIGINT UNSIGNED NULL,
  unit_id          BIGINT UNSIGNED NULL,
  budget           DECIMAL(15,2)   NOT NULL DEFAULT 0,
  requirement      VARCHAR(300)    NULL,            -- "2BHK east facing", etc.
  stage            ENUM('new','contacted','site_visit','negotiation','booked','lost') NOT NULL DEFAULT 'new',
  lost_reason      VARCHAR(300)    NULL,
  notes            VARCHAR(500)    NULL,
  dedupe_key       VARCHAR(20)     NULL,            -- normalized phone (last 10 digits)
  owner_lock_until DATETIME        NULL,            -- Module 2.6
  assigned_admin_id BIGINT UNSIGNED NULL,           -- Module 2.4
  last_activity_at DATETIME        NULL,            -- Module 2.7
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leads_agent (agent_id),
  KEY idx_leads_stage (stage),
  KEY idx_leads_project (project_id),
  KEY idx_leads_dedupe (dedupe_key),
  CONSTRAINT fk_leads_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL,
  CONSTRAINT fk_leads_project FOREIGN KEY (project_id) REFERENCES agent_projects (id) ON DELETE SET NULL,
  CONSTRAINT fk_leads_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE SET NULL
) ENGINE=InnoDB;
