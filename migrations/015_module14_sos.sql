-- =========================================================================
-- Module 14 — Emergency SOS Assistance
--   • medical_profiles  — blood group + medical notes per user
--   • Extends sos_requests with request code, ETA and dispatch label
--   (emergency_contacts + sos_requests base tables already exist in 001)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE sos_requests
  ADD COLUMN request_code    VARCHAR(20) NULL AFTER id,
  ADD COLUMN eta_minutes     INT         NULL AFTER status,
  ADD COLUMN ambulance_label VARCHAR(80) NULL AFTER eta_minutes;

CREATE UNIQUE INDEX uk_sos_request_code ON sos_requests (request_code);

CREATE TABLE IF NOT EXISTS medical_profiles (
  user_id      BIGINT UNSIGNED NOT NULL,
  blood_group  VARCHAR(5)      NULL,
  medical_notes VARCHAR(500)   NULL,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_medprofile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
