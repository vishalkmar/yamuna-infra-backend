-- =========================================================================
-- Task 8 — Resident Profile + Settings backend (were mock-only in the app).
--   Persists user-entered profile/family/preferences/settings to the DB so
--   the app + portal share the same data. KYC reuses the users.kyc_* columns.
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      BIGINT UNSIGNED NOT NULL,
  dob          DATE         NULL,
  gender       VARCHAR(10)  NULL,
  alt_phone    VARCHAR(15)  NULL,
  occupation   VARCHAR(80)  NULL,
  address_line VARCHAR(200) NULL,
  city         VARCHAR(80)  NULL,
  state        VARCHAR(80)  NULL,
  pincode      VARCHAR(10)  NULL,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id         BIGINT UNSIGNED NOT NULL,
  language        VARCHAR(10) NOT NULL DEFAULT 'en',
  dietary         VARCHAR(20) NOT NULL DEFAULT 'veg',
  channels        JSON        NULL,
  festival_alerts TINYINT(1)  NOT NULL DEFAULT 1,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS family_members (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(120) NOT NULL,
  relation   VARCHAR(40)  NULL,
  age        INT          NULL,
  phone      VARCHAR(15)  NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_family_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id    BIGINT UNSIGNED NOT NULL,
  data       JSON      NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB;
