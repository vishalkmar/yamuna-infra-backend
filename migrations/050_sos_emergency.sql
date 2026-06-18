-- =========================================================================
-- Task — SOS & Emergency (admin-managed, global)
--   • sos_config        — single SOS dispatch phone (one row)
--   • emergency_services — admin-managed list of services shown to every
--                          resident in the app (name + phone)
--   • sos_requests reused for live alerts (status active -> resolved on ack);
--     add ack_at for record.
--   Idempotent (MySQL 8).
-- =========================================================================

CREATE TABLE IF NOT EXISTS sos_config (
  id         TINYINT(1)   NOT NULL DEFAULT 1,
  sos_phone  VARCHAR(20)  NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO sos_config (id, sos_phone)
SELECT 1, NULL WHERE NOT EXISTS (SELECT 1 FROM sos_config WHERE id = 1);

CREATE TABLE IF NOT EXISTS emergency_services (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120)    NOT NULL,
  phone      VARCHAR(20)     NOT NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_emerg_sort (sort_order)
) ENGINE=InnoDB;

-- ack timestamp on the existing sos_requests table
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sos_requests' AND COLUMN_NAME = 'ack_at');
SET @s := IF(@c = 0, 'ALTER TABLE sos_requests ADD COLUMN ack_at DATETIME NULL AFTER status', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
