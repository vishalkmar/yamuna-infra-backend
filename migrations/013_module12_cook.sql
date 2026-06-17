-- =========================================================================
-- Module 12 — Cook Booking
--   • Extends service_bookings with cook-specific options (meals / diet / persons)
--   • Seeds cook providers under the 'cook' category
--   Reuses the Home Services engine (Module 10).
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE service_bookings
  ADD COLUMN meals     VARCHAR(60) NULL AFTER preferred_time,  -- CSV: breakfast,lunch,dinner
  ADD COLUMN diet_type VARCHAR(20) NULL AFTER meals,           -- veg / jain / non_veg
  ADD COLUMN persons   INT         NULL AFTER diet_type;

SET FOREIGN_KEY_CHECKS = 1;

-- ----- Cook providers -----
INSERT INTO service_providers (category_id, name, tagline, phone, gender, rating, experience_years, price_from, active)
SELECT c.id, src.name, src.tagline, src.phone, src.gender, src.rating, src.exp, src.price, 1
FROM service_categories c
JOIN (
  SELECT 'cook' AS cat, 'Annapurna Rasoi'  AS name, 'Pure veg, North & South Indian' AS tagline, '9820010202' AS phone, 'female' AS gender, 4.8 AS rating, 8 AS exp, 6500.00 AS price UNION ALL
  SELECT 'cook',        'Maa Ki Rasoi',           'Homely daily meals, low oil',             '9820010203', 'female', 4.6, 5, 5500.00 UNION ALL
  SELECT 'cook',        'Brij Bhoj Cooks',        'Satvik & festival bhog specialists',      '9820010204', 'any',    4.7, 7, 7000.00
) src ON src.cat = c.code
WHERE NOT EXISTS (SELECT 1 FROM service_providers p WHERE p.name = src.name);
