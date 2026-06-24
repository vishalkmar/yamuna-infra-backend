-- =========================================================================
-- Agent Management System — Module 1.8: Bank / Payout details (TDS profile)
--   • agent_bank_details — one row per agent (PK = agent_id) holding the bank
--     account commission payouts are sent to. Any edit clears `verified` so the
--     office must re-verify before paying.
--   • PAN / GST already live on `agents` (the TDS profile); the agent can now
--     maintain them via the self-service payout screen.
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_bank_details (
  agent_id        BIGINT UNSIGNED NOT NULL,
  account_holder  VARCHAR(140)    NULL,
  account_number  VARCHAR(40)     NULL,
  ifsc            VARCHAR(20)     NULL,
  bank_name       VARCHAR(140)    NULL,
  branch          VARCHAR(140)    NULL,
  account_type    ENUM('savings','current') NOT NULL DEFAULT 'savings',
  upi_id          VARCHAR(120)    NULL,
  verified        TINYINT(1)      NOT NULL DEFAULT 0,
  verified_by     VARCHAR(120)    NULL,
  verified_at     DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id),
  CONSTRAINT fk_agent_bank_agent FOREIGN KEY (agent_id)
    REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB;
