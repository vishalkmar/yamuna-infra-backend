-- =========================================================================
-- Modules 18–20 — Spiritual Concierge & Vrindavan Temple Directory
--   • Extends temples (crowd, distance, media, aarti, maps/donation links)
--   • temple_festivals — festival calendar
--   • Extends darshan_bookings (code, special puja, VIP)
--   (temples / darshan_bookings / darshan_booking_temples exist in 001)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE temples
  ADD COLUMN crowd_status ENUM('low','moderate','high','very_high') NOT NULL DEFAULT 'moderate' AFTER rating,
  ADD COLUMN distance_km  DECIMAL(4,1)  NULL AFTER crowd_status,
  ADD COLUMN image_url    VARCHAR(500)  NULL AFTER distance_km,
  ADD COLUMN aarti_times  VARCHAR(250)  NULL AFTER image_url,
  ADD COLUMN maps_url     VARCHAR(500)  NULL AFTER aarti_times,
  ADD COLUMN donation_url VARCHAR(500)  NULL AFTER maps_url,
  ADD COLUMN vip_available TINYINT(1)   NOT NULL DEFAULT 0 AFTER donation_url;

ALTER TABLE darshan_bookings
  ADD COLUMN booking_code VARCHAR(20) NULL AFTER id,
  ADD COLUMN special_puja VARCHAR(40) NULL AFTER group_name,
  ADD COLUMN is_vip       TINYINT(1)  NOT NULL DEFAULT 0 AFTER special_puja;

CREATE UNIQUE INDEX uk_darshan_code ON darshan_bookings (booking_code);

CREATE TABLE IF NOT EXISTS temple_festivals (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  temple_id     BIGINT UNSIGNED NULL,            -- NULL → applies to all temples
  name          VARCHAR(120)    NOT NULL,
  festival_date DATE            NOT NULL,
  significance  VARCHAR(300)    NULL,
  active        TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_festival_date (festival_date)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — temples
-- =========================================================================

INSERT INTO temples (name, city, rating, crowd_status, distance_km, image_url, aarti_times, maps_url, donation_url, vip_available, description, active)
SELECT src.name, 'Vrindavan', src.rating, src.crowd, src.dist, src.img, src.aarti, src.maps, src.donate, src.vip, src.descr, 1 FROM (
  SELECT 'Banke Bihari Temple'  AS name, 4.9 AS rating, 'very_high' AS crowd, 2.5 AS dist, 'https://picsum.photos/seed/banke/800/450'  AS img, 'Shringar 9:00 AM, Rajbhog 12:00 PM, Shayan 9:00 PM' AS aarti, 'https://maps.google.com/?q=Banke+Bihari+Temple+Vrindavan' AS maps, 'https://example.invalid/donate/banke' AS donate, 1 AS vip, 'The most revered temple of Vrindavan, dedicated to Lord Krishna as Banke Bihari.' AS descr UNION ALL
  SELECT 'Prem Mandir',                4.8,            'moderate',        4.0,        'https://picsum.photos/seed/prem/800/450',         'Darshan 8:30 AM – 12 PM, 4:30 – 8:30 PM',            'https://maps.google.com/?q=Prem+Mandir+Vrindavan',        'https://example.invalid/donate/prem',  1,        'A stunning marble temple with light & fountain shows in the evening.' UNION ALL
  SELECT 'ISKCON Vrindavan',           4.7,            'high',            5.5,        'https://picsum.photos/seed/iskcon/800/450',       'Mangala 4:30 AM, Shringar 7:15 AM, Sandhya 6:30 PM', 'https://maps.google.com/?q=ISKCON+Vrindavan',             'https://example.invalid/donate/iskcon',1,        'Krishna-Balaram Mandir, known for kirtans and the Govardhan feast.' UNION ALL
  SELECT 'Radha Raman Temple',         4.8,            'moderate',        3.0,        'https://picsum.photos/seed/radharaman/800/450',   'Mangala 5:00 AM, Shringar 8:00 AM, Shayan 8:00 PM',  'https://maps.google.com/?q=Radha+Raman+Temple+Vrindavan', 'https://example.invalid/donate/radharaman', 0,    'One of the seven Goswami temples, with a self-manifested deity.' UNION ALL
  SELECT 'Nidhivan',                   4.6,            'low',             2.8,        'https://picsum.photos/seed/nidhivan/800/450',     'Open 6:00 AM – 8:00 PM (closed at night)',           'https://maps.google.com/?q=Nidhivan+Vrindavan',           'https://example.invalid/donate/nidhivan', 0,     'The sacred grove where Krishna is believed to perform raas leela nightly.'
) src
WHERE NOT EXISTS (SELECT 1 FROM temples t WHERE t.name = src.name);

-- =========================================================================
-- SEED — festivals
-- =========================================================================

INSERT INTO temple_festivals (temple_id, name, festival_date, significance, active)
SELECT NULL, src.name, src.fdate, src.sig, 1 FROM (
  SELECT 'Janmashtami'    AS name, '2026-09-04' AS fdate, 'Birth of Lord Krishna — midnight celebrations & extended darshan' AS sig UNION ALL
  SELECT 'Radhashtami',          '2026-09-19',          'Birth of Radha Rani — special shringar at all temples'           UNION ALL
  SELECT 'Sharad Purnima',       '2026-10-25',          'Raas Purnima — moonlight raas leela celebrations'                UNION ALL
  SELECT 'Govardhan Puja',       '2026-11-09',          'Annakut feast at ISKCON & Govardhan parikrama'                   UNION ALL
  SELECT 'Holi (Phoolon wali)',  '2027-03-13',          'Famous flower & gulal Holi at Banke Bihari'
) src
WHERE NOT EXISTS (SELECT 1 FROM temple_festivals f WHERE f.name = src.name AND f.festival_date = src.fdate);
