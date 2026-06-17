-- =========================================================================
-- Admin Portal — Module A3: Users & Residents
--   Extends `users` with admin-side management fields the app didn't persist
--   (block/unblock, KYC review state, internal notes). The resident app can
--   later populate kyc_status='pending' + id fields when its KYC flow goes live;
--   the admin reviews/approves here.
-- =========================================================================

ALTER TABLE users
  ADD COLUMN is_active        TINYINT(1)   NOT NULL DEFAULT 1 AFTER email,
  ADD COLUMN kyc_status       ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none' AFTER is_active,
  ADD COLUMN kyc_id_type      VARCHAR(30)  NULL AFTER kyc_status,
  ADD COLUMN kyc_id_number    VARCHAR(60)  NULL AFTER kyc_id_type,
  ADD COLUMN kyc_reviewed_at  DATETIME     NULL AFTER kyc_id_number,
  ADD COLUMN kyc_reject_reason VARCHAR(255) NULL AFTER kyc_reviewed_at,
  ADD COLUMN admin_notes      VARCHAR(500) NULL AFTER kyc_reject_reason;

CREATE INDEX idx_users_kyc_status ON users (kyc_status);
CREATE INDEX idx_users_is_active ON users (is_active);
