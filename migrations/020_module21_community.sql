-- =========================================================================
-- Modules 21–23 — Community Portal, Visitor Management & Amenity Booking
--   • community_announcements / community_events — resident feed
--   • Extends amenities (code, icon) + amenity_bookings (code, extra services)
--   • amenity_blackouts — maintenance days
--   (visitor_passes / amenities / amenity_bookings exist in 001)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE amenities
  ADD COLUMN code VARCHAR(30) NULL AFTER id,
  ADD COLUMN icon VARCHAR(10) NULL AFTER name;

ALTER TABLE amenity_bookings
  ADD COLUMN booking_code   VARCHAR(20)  NULL AFTER id,
  ADD COLUMN extra_services VARCHAR(120) NULL AFTER occasion;

CREATE UNIQUE INDEX uk_amenity_booking_code ON amenity_bookings (booking_code);

CREATE TABLE IF NOT EXISTS community_announcements (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title     VARCHAR(160)    NOT NULL,
  body      VARCHAR(600)    NOT NULL,
  category  VARCHAR(40)     NULL,
  pinned    TINYINT(1)      NOT NULL DEFAULT 0,
  posted_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ann_posted (pinned, posted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS community_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(160)    NOT NULL,
  description VARCHAR(500)    NULL,
  event_date  DATE            NOT NULL,
  location    VARCHAR(120)    NULL,
  active      TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_event_date (event_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS amenity_blackouts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  amenity_id    BIGINT UNSIGNED NOT NULL,
  blackout_date DATE            NOT NULL,
  reason        VARCHAR(120)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_blackout (amenity_id, blackout_date),
  CONSTRAINT fk_blackout_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED
-- =========================================================================

INSERT INTO amenities (code, name, icon, capacity, deposit, active)
SELECT src.code, src.name, src.icon, src.cap, src.deposit, 1 FROM (
  SELECT 'HALL'   AS code, 'Community Hall' AS name, '🏛️' AS icon, 150 AS cap, 5000.00 AS deposit UNION ALL
  SELECT 'YOGA',          'Yoga Hall',             '🧘',          30,         0.00 UNION ALL
  SELECT 'POOL',          'Swimming Pool',         '🏊',          40,         0.00 UNION ALL
  SELECT 'TENNIS',        'Tennis Court',          '🎾',          4,          0.00 UNION ALL
  SELECT 'LAWN',          'Party Lawn',            '🌳',          200,        8000.00
) src
WHERE NOT EXISTS (SELECT 1 FROM amenities a WHERE a.name = src.name);

INSERT INTO community_announcements (title, body, category, pinned)
SELECT src.title, src.body, src.cat, src.pin FROM (
  SELECT 'Water supply maintenance' AS title, 'Water supply will be off on Tower 2 between 10 AM – 1 PM this Saturday for tank cleaning.' AS body, 'maintenance' AS cat, 1 AS pin UNION ALL
  SELECT 'Janmashtami decoration drive', 'Volunteers needed to decorate the community hall. Register at the clubhouse desk.', 'event', 0 UNION ALL
  SELECT 'Annual General Meeting', 'The society AGM is scheduled for next month. Agenda and venue will be shared soon.', 'notice', 0
) src
WHERE NOT EXISTS (SELECT 1 FROM community_announcements a WHERE a.title = src.title);

INSERT INTO community_events (title, description, event_date, location, active)
SELECT src.title, src.descr, src.edate, src.loc, 1 FROM (
  SELECT 'Holi Celebration'    AS title, 'Phoolon wali Holi with dhol & thandai' AS descr, '2027-03-13' AS edate, 'Party Lawn'     AS loc UNION ALL
  SELECT 'Morning Yoga Camp',         '7-day sunrise yoga camp for all residents',     '2026-09-21',          'Yoga Hall'              UNION ALL
  SELECT 'Kids Summer Workshop',      'Art, music & dance for children 5-14',          '2026-10-05',          'Community Hall'
) src
WHERE NOT EXISTS (SELECT 1 FROM community_events e WHERE e.title = src.title);

-- Community Hall under maintenance on a sample date.
INSERT INTO amenity_blackouts (amenity_id, blackout_date, reason)
SELECT a.id, '2026-08-15', 'Annual deep-clean & repairs' FROM amenities a
WHERE a.name = 'Community Hall'
  AND NOT EXISTS (SELECT 1 FROM amenity_blackouts b WHERE b.amenity_id = a.id AND b.blackout_date = '2026-08-15');
