-- =========================================================================
-- Task 1 — Admin-managed Residents + Properties
--   Residents are now created/managed ONLY from the admin portal (no app
--   self-signup). Adds a profile photo to users and a per-resident property
--   table (a resident can own one or more flats). Self-address reuses the
--   existing user_profiles (address_line/city/state/pincode) columns.
--
--   Written idempotently (MySQL 8 has no "ADD COLUMN IF NOT EXISTS") so it is
--   safe to re-run / apply to partially-migrated databases.
-- =========================================================================

-- users.profile_photo --------------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_photo');
SET @s := IF(@c = 0,
  'ALTER TABLE users ADD COLUMN profile_photo VARCHAR(500) NULL AFTER email',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.created_source -------------------------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'created_source');
SET @s := IF(@c = 0,
  "ALTER TABLE users ADD COLUMN created_source ENUM('admin','app') NOT NULL DEFAULT 'admin' AFTER profile_photo",
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- email lookup index (resident login is by email) ----------------------------
SET @i := (SELECT COUNT(*) FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email');
SET @s := IF(@i = 0, 'CREATE INDEX idx_users_email ON users (email)', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- per-resident properties ----------------------------------------------------
CREATE TABLE IF NOT EXISTS user_properties (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  label          VARCHAR(120)    NULL,            -- e.g. "Home", "Investment flat"
  project_name   VARCHAR(180)    NULL,
  tower          VARCHAR(60)     NULL,            -- tower / block
  flat_no        VARCHAR(40)     NULL,
  floor          VARCHAR(20)     NULL,
  area_sqft      DECIMAL(10,2)   NULL,            -- carpet/built-up area
  property_type  VARCHAR(40)     NULL,            -- 1BHK / 2BHK / villa ...
  address_line   VARCHAR(250)    NULL,
  city           VARCHAR(80)     NULL,
  state          VARCHAR(80)     NULL,
  pincode        VARCHAR(10)     NULL,
  notes          VARCHAR(500)    NULL,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_properties_user (user_id),
  CONSTRAINT fk_user_properties_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
