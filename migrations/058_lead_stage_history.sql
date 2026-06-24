-- =========================================================================
-- Agent Management System — Module 2.5: Lead Pipeline / Funnel
--   • lead_stage_history — one row per stage change (who moved it, from→to,
--     optional note). Powers the lead timeline + funnel analytics (2.9).
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS lead_stage_history (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id         BIGINT UNSIGNED NOT NULL,
  from_stage      VARCHAR(20)     NULL,
  to_stage        VARCHAR(20)     NOT NULL,
  changed_by_type ENUM('agent','admin') NOT NULL,
  changed_by_name VARCHAR(120)    NULL,
  note            VARCHAR(300)    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead_history_lead (lead_id),
  CONSTRAINT fk_lead_history_lead FOREIGN KEY (lead_id)
    REFERENCES leads (id) ON DELETE CASCADE
) ENGINE=InnoDB;
