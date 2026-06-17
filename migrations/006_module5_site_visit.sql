-- =========================================================================
-- Module 5 — Site Visit & Virtual Tour Booking
--   • Extends site_visits with project link, confirmation code, audit cols
--   • site_visit_slots — per-project slot definitions (day-of-week → time)
--   • site_visit_blackout_dates — holidays / project-specific blackouts
--   • virtual_tour_links — Matterport / video-call / Maps deeplinks per project
--   • Seeds slots for Mon-Sat (blueprint slots: 10/11/14/16), 2026 festival
--     blackouts, virtual tour URL set, project geo
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE site_visits
  ADD COLUMN project_id        BIGINT UNSIGNED NULL AFTER booking_id,
  ADD COLUMN confirmation_code VARCHAR(30)     NULL AFTER preferred_lang,
  ADD COLUMN cancelled_at      DATETIME        NULL AFTER status,
  ADD COLUMN cancel_reason     VARCHAR(300)    NULL AFTER cancelled_at,
  ADD COLUMN reschedule_count  INT             NOT NULL DEFAULT 0 AFTER cancel_reason;

CREATE UNIQUE INDEX uk_sv_confirmation ON site_visits (confirmation_code);
CREATE INDEX idx_sv_date_slot ON site_visits (project_id, visit_date, visit_time);

ALTER TABLE projects
  ADD COLUMN lat              DECIMAL(10,7)   NULL,
  ADD COLUMN lng              DECIMAL(10,7)   NULL,
  ADD COLUMN address          VARCHAR(255)    NULL;

CREATE TABLE IF NOT EXISTS site_visit_slots (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  -- 0 = Sunday … 6 = Saturday (MySQL DAYOFWEEK uses 1-7, but we store 0-6 for app sanity)
  day_of_week  TINYINT         NOT NULL,
  slot_time    TIME            NOT NULL,
  capacity     INT             NOT NULL DEFAULT 8,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_svs_project_day_time (project_id, day_of_week, slot_time),
  CONSTRAINT fk_svs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_visit_blackout_dates (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NULL,           -- NULL → applies to all projects
  blackout_date DATE           NOT NULL,
  reason       VARCHAR(120)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_svb_project_date (project_id, blackout_date),
  CONSTRAINT fk_svb_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS virtual_tour_links (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  kind         ENUM('matterport','360_video','video_call','maps','brochure') NOT NULL,
  label        VARCHAR(100)    NOT NULL,
  url          VARCHAR(500)    NOT NULL,
  sort_order   INT             NOT NULL DEFAULT 0,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_vt_project (project_id, active, sort_order),
  CONSTRAINT fk_vt_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED
-- =========================================================================

-- Project geo + address
UPDATE projects
SET lat = 27.5803,
    lng = 77.7000,
    address = 'Vrindavan Heights, Mathura Road, Vrindavan, UP 281121'
WHERE code = 'VH';

-- Slots: 10:00, 11:00, 14:00, 16:00 — Mon-Sat (1-6). Sunday (0) is closed.
INSERT INTO site_visit_slots (project_id, day_of_week, slot_time, capacity)
SELECT p.id, d.dow, t.slot_time, 8
FROM projects p
JOIN (SELECT 1 AS dow UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d
JOIN (
  SELECT '10:00:00' AS slot_time UNION SELECT '11:00:00' UNION SELECT '14:00:00' UNION SELECT '16:00:00'
) t
WHERE p.code = 'VH'
  AND NOT EXISTS (
    SELECT 1 FROM site_visit_slots s
    WHERE s.project_id = p.id AND s.day_of_week = d.dow AND s.slot_time = t.slot_time
  );

-- A few festival blackouts (2026)
INSERT INTO site_visit_blackout_dates (project_id, blackout_date, reason)
SELECT p.id, src.date, src.reason FROM projects p
JOIN (
  SELECT '2026-08-15' AS date, 'Independence Day' AS reason UNION ALL
  SELECT '2026-10-02',          'Gandhi Jayanti'           UNION ALL
  SELECT '2026-11-08',          'Diwali'                   UNION ALL
  SELECT '2026-12-25',          'Christmas'                UNION ALL
  SELECT '2027-01-26',          'Republic Day'             UNION ALL
  SELECT '2027-03-25',          'Holi'
) src
WHERE p.code = 'VH'
  AND NOT EXISTS (
    SELECT 1 FROM site_visit_blackout_dates b
    WHERE b.project_id = p.id AND b.blackout_date = src.date
  );

-- Virtual tour links
INSERT INTO virtual_tour_links (project_id, kind, label, url, sort_order)
SELECT p.id, src.kind, src.label, src.url, src.sort_order
FROM projects p JOIN (
  SELECT 'matterport' AS kind, '360° Virtual Tour'      AS label, 'https://my.matterport.com/show/?m=demo-vrindavan' AS url, 1 AS sort_order UNION ALL
  SELECT '360_video',          'Drone Walkthrough',                'https://example.invalid/drone-walkthrough.mp4',                                 2 UNION ALL
  SELECT 'video_call',         'Live Sales Call',                  'https://meet.jit.si/YamunaInfra-SalesDesk',                                     3 UNION ALL
  SELECT 'maps',               'Open in Google Maps',              'https://maps.google.com/?q=27.5803,77.7000',                                    4 UNION ALL
  SELECT 'brochure',           'Project Brochure',                  '/files/welcome-kit/vrindavan-heights-welcome.pdf',                              5
) src ON p.code = 'VH'
WHERE NOT EXISTS (
  SELECT 1 FROM virtual_tour_links v WHERE v.project_id = p.id AND v.label = src.label
);
