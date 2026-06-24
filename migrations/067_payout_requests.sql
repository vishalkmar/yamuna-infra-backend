-- =========================================================================
-- Agent Management System — Module 4.3: Payout Requests & Approval
--   • payout_requests — an agent withdraws their APPROVED commission. The
--     selected commission_ledger rows are tagged with payout_id. Flow:
--     requested → approved → processing → paid | rejected.
--     tds / net are filled by Module 4.4 (for now net = amount, tds = 0).
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS payout_requests (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id      BIGINT UNSIGNED NULL,
  amount        DECIMAL(15,2)   NOT NULL DEFAULT 0,
  tds           DECIMAL(15,2)   NOT NULL DEFAULT 0,
  net           DECIMAL(15,2)   NOT NULL DEFAULT 0,
  status        ENUM('requested','approved','processing','paid','rejected') NOT NULL DEFAULT 'requested',
  method        VARCHAR(40)     NULL,
  txn_ref       VARCHAR(80)     NULL,
  reject_reason VARCHAR(300)    NULL,
  notes         VARCHAR(300)    NULL,
  processed_by  VARCHAR(120)    NULL,
  processed_at  DATETIME        NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payouts_agent (agent_id, status),
  KEY idx_payouts_status (status),
  CONSTRAINT fk_payouts_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL
) ENGINE=InnoDB;
