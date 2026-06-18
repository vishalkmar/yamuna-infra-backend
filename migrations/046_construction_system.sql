-- =========================================================================
-- Task 2 — Construction System Management (per-property, admin-managed)
--   • Overall progress card fields live on user_properties (set at resident
--     creation, editable): work_status (expected/completed), target date,
--     percent, floors.
--   • construction_steps      — dynamic, drag-drop ordered stages per property
--   • construction_step_entries — multiple dated photo entries inside a step
--   • construction_updates    — weekly updates (also pushed to notifications)
--
--   Idempotent (MySQL 8) so it is safe to re-run / apply to partial DBs.
-- =========================================================================

-- ---- overall fields on user_properties -------------------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_properties' AND COLUMN_NAME = 'work_status');
SET @s := IF(@c = 0,
  "ALTER TABLE user_properties ADD COLUMN work_status ENUM('expected','completed') NOT NULL DEFAULT 'expected' AFTER notes",
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_properties' AND COLUMN_NAME = 'work_target_date');
SET @s := IF(@c = 0,
  'ALTER TABLE user_properties ADD COLUMN work_target_date DATE NULL AFTER work_status',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_properties' AND COLUMN_NAME = 'work_percent');
SET @s := IF(@c = 0,
  'ALTER TABLE user_properties ADD COLUMN work_percent INT NOT NULL DEFAULT 0 AFTER work_target_date',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_properties' AND COLUMN_NAME = 'floors_total');
SET @s := IF(@c = 0,
  'ALTER TABLE user_properties ADD COLUMN floors_total INT NULL AFTER work_percent, ADD COLUMN floors_done INT NULL AFTER floors_total',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---- dynamic steps ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS construction_steps (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id    BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(150)    NOT NULL,
  status         ENUM('planned','in_progress','completed','postponed','on_hold') NOT NULL DEFAULT 'planned',
  expected_date  DATE            NULL,
  completed_date DATE            NULL,
  percent        INT             NOT NULL DEFAULT 0,
  floors_reached VARCHAR(60)     NULL,
  cover_photo_url VARCHAR(500)   NULL,
  notes          VARCHAR(1000)   NULL,
  sort_order     INT             NOT NULL DEFAULT 0,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cs_property (property_id, sort_order),
  CONSTRAINT fk_cs_property FOREIGN KEY (property_id) REFERENCES user_properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- dated photo entries inside a step -------------------------------------
CREATE TABLE IF NOT EXISTS construction_step_entries (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  step_id     BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(200)    NULL,
  entry_date  DATE            NULL,
  note        VARCHAR(1000)   NULL,
  images      JSON            NULL,          -- array of { url, caption }
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cse_step (step_id),
  CONSTRAINT fk_cse_step FOREIGN KEY (step_id) REFERENCES construction_steps (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- weekly updates (also surfaced as notifications) -----------------------
CREATE TABLE IF NOT EXISTS construction_updates (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(200)    NOT NULL,
  description TEXT            NULL,
  media_url   VARCHAR(500)    NULL,
  media_type  ENUM('image','video') NOT NULL DEFAULT 'image',
  posted_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cu_property (property_id, posted_at),
  CONSTRAINT fk_cu_property FOREIGN KEY (property_id) REFERENCES user_properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;
