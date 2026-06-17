-- =========================================================================
-- Admin Portal — Module A19: Audit Logs & Role Admin
--   audit_logs records who/what/when for every admin write (auto via middleware).
--   The admins table (from A1) is reused for role/team management.
-- =========================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    BIGINT UNSIGNED NULL,
  admin_name  VARCHAR(120)    NULL,
  action      VARCHAR(10)     NOT NULL,
  entity      VARCHAR(120)    NULL,
  entity_id   VARCHAR(40)     NULL,
  path        VARCHAR(255)    NULL,
  status_code INT             NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin (admin_id),
  KEY idx_audit_entity (entity),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB;
