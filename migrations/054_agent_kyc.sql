-- =========================================================================
-- Agent Management System — Module 1.3: Agent KYC & Verification
--   • agent_documents — KYC files an agent submits (PAN / Aadhaar / GST / RERA /
--     cancelled cheque / agreement / photo / other). Each doc is reviewed
--     individually (pending → approved | rejected).
--   • agents.kyc_reviewed_at / kyc_reject_reason — the OVERALL KYC decision the
--     admin records (the per-doc statuses are evidence for that call).
--
--   New table → idempotent (CREATE TABLE IF NOT EXISTS). Column adds use the
--   MySQL-8 information_schema guard so the file is safe to re-run.
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_documents (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id      BIGINT UNSIGNED NOT NULL,
  doc_type      ENUM('pan','aadhaar','gst','rera','cheque','agreement','photo','other')
                                NOT NULL DEFAULT 'other',
  label         VARCHAR(140)    NULL,
  url           VARCHAR(500)    NOT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(300)    NULL,
  reviewed_by   VARCHAR(120)    NULL,
  reviewed_at   DATETIME        NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agent_documents_agent (agent_id),
  CONSTRAINT fk_agent_documents_agent FOREIGN KEY (agent_id)
    REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- agents.kyc_reviewed_at -----------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'kyc_reviewed_at');
SET @s := IF(@c = 0,
  'ALTER TABLE agents ADD COLUMN kyc_reviewed_at DATETIME NULL AFTER kyc_status',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- agents.kyc_reject_reason ---------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'kyc_reject_reason');
SET @s := IF(@c = 0,
  'ALTER TABLE agents ADD COLUMN kyc_reject_reason VARCHAR(300) NULL AFTER kyc_reviewed_at',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
