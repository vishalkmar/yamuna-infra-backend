-- =========================================================================
-- Agent Management System — Module 4.5: Targets & Incentive Schemes
--   • agent_targets — a sales target for an agent over a period. metric is
--     'bookings' (count of approved bookings) or 'deal_value' (sum). Achievement
--     is computed live from agent_bookings. On achieving, an incentive_amount can
--     be awarded → a commission_ledger adjustment. status: active → awarded.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_targets (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id         BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(140)    NOT NULL,
  metric           ENUM('bookings','deal_value') NOT NULL DEFAULT 'deal_value',
  target_value     DECIMAL(15,2)   NOT NULL DEFAULT 0,
  period_start     DATE            NOT NULL,
  period_end       DATE            NOT NULL,
  incentive_amount DECIMAL(15,2)   NOT NULL DEFAULT 0,
  status           ENUM('active','awarded') NOT NULL DEFAULT 'active',
  notes            VARCHAR(300)    NULL,
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_targets_agent (agent_id),
  CONSTRAINT fk_targets_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB;
