-- =========================================================================
-- Agent Management System — Module 5.9: Settings & Feature Flags
--   • ams_settings — key/value config for the AMS:
--       hold_hours        default unit-hold duration (Module 2.2)
--       lock_days         lead ownership-lock window (Module 2.6)
--       tds_percent       default TDS on payouts (Module 4.4)
--       self_registration whether agents may self-register (Module 1.1)
--
--   New table → idempotent. Seeds only insert if the key is missing.
-- =========================================================================

CREATE TABLE IF NOT EXISTS ams_settings (
  setting_key   VARCHAR(60)  NOT NULL,
  setting_value VARCHAR(255) NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

INSERT INTO ams_settings (setting_key, setting_value)
SELECT * FROM (SELECT 'hold_hours' AS k, '48' AS v) t
WHERE NOT EXISTS (SELECT 1 FROM ams_settings s WHERE s.setting_key = 'hold_hours');

INSERT INTO ams_settings (setting_key, setting_value)
SELECT * FROM (SELECT 'lock_days', '90') t
WHERE NOT EXISTS (SELECT 1 FROM ams_settings s WHERE s.setting_key = 'lock_days');

INSERT INTO ams_settings (setting_key, setting_value)
SELECT * FROM (SELECT 'tds_percent', '5') t
WHERE NOT EXISTS (SELECT 1 FROM ams_settings s WHERE s.setting_key = 'tds_percent');

INSERT INTO ams_settings (setting_key, setting_value)
SELECT * FROM (SELECT 'self_registration', 'true') t
WHERE NOT EXISTS (SELECT 1 FROM ams_settings s WHERE s.setting_key = 'self_registration');
