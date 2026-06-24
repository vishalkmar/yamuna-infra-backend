-- =========================================================================
-- Agent Management System — Module 4.2: Commission Ledger
--   • commission_ledger — one earning row per approved booking. Auto-created
--     when a booking is approved (rule resolved + amount computed at that moment;
--     rule_snapshot keeps a human label even if the rule later changes).
--     status: accrued → approved → paid | reversed.
--     payout_id links the row to a payout batch (Module 4.3).
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS commission_ledger (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id      BIGINT UNSIGNED NULL,
  booking_id    BIGINT UNSIGNED NULL,
  rule_id       BIGINT UNSIGNED NULL,
  deal_value    DECIMAL(15,2)   NOT NULL DEFAULT 0,
  amount        DECIMAL(15,2)   NOT NULL DEFAULT 0,
  status        ENUM('accrued','approved','paid','reversed') NOT NULL DEFAULT 'accrued',
  rule_snapshot VARCHAR(200)    NULL,
  payout_id     BIGINT UNSIGNED NULL,
  notes         VARCHAR(300)    NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ledger_agent (agent_id, status),
  KEY idx_ledger_booking (booking_id),
  KEY idx_ledger_payout (payout_id),
  CONSTRAINT fk_ledger_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL,
  CONSTRAINT fk_ledger_booking FOREIGN KEY (booking_id) REFERENCES agent_bookings (id) ON DELETE SET NULL,
  CONSTRAINT fk_ledger_rule FOREIGN KEY (rule_id) REFERENCES commission_rules (id) ON DELETE SET NULL
) ENGINE=InnoDB;
