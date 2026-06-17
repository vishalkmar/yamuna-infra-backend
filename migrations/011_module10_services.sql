-- =========================================================================
-- Module 10 — Home Cleaning Scheduler (shared Home Services infra)
--   • Extends service_providers with tagline / experience / starting price
--   • Seeds service categories (cleaning, cook, housekeeping, attendant)
--   • Seeds cleaning providers (+ a couple for cook/housekeeping for later)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE service_providers
  ADD COLUMN tagline          VARCHAR(160)  NULL AFTER name,
  ADD COLUMN experience_years INT           NULL AFTER rating,
  ADD COLUMN price_from       DECIMAL(10,2) NULL AFTER experience_years;

SET FOREIGN_KEY_CHECKS = 1;

-- ----- Categories -----
INSERT INTO service_categories (code, name, icon)
SELECT src.code, src.name, src.icon FROM (
  SELECT 'cleaning'     AS code, 'Home Cleaning'           AS name, '🧹' AS icon UNION ALL
  SELECT 'cook',              'Cook',                            '👨‍🍳' UNION ALL
  SELECT 'housekeeping',      'Housekeeping',                    '🧺' UNION ALL
  SELECT 'attendant',         'Attendant',                       '🧑‍⚕️'
) src
WHERE NOT EXISTS (SELECT 1 FROM service_categories c WHERE c.code = src.code);

-- ----- Providers (mostly cleaning for Module 10) -----
INSERT INTO service_providers (category_id, name, tagline, phone, gender, rating, experience_years, price_from, active)
SELECT c.id, src.name, src.tagline, src.phone, src.gender, src.rating, src.exp, src.price, 1
FROM service_categories c
JOIN (
  SELECT 'cleaning' AS cat, 'Sparkle Home Services' AS name, 'Deep cleaning specialists' AS tagline, '9820010001' AS phone, 'any' AS gender, 4.8 AS rating, 6 AS exp, 499.00 AS price UNION ALL
  SELECT 'cleaning',        'FreshNest Cleaners',          'Eco-friendly products only',     '9820010002', 'female', 4.6, 4, 399.00 UNION ALL
  SELECT 'cleaning',        'PrideCare Facility',          'Trained & background-verified',  '9820010003', 'male',   4.5, 8, 599.00 UNION ALL
  SELECT 'housekeeping',    'DailyHelp Housekeeping',      'Live-in & part-time maids',      '9820010101', 'any',    4.4, 5, 8000.00 UNION ALL
  SELECT 'cook',            'GharKaKhana Cooks',           'Satvik & regional cuisine',      '9820010201', 'female', 4.7, 7, 6000.00
) src ON src.cat = c.code
WHERE NOT EXISTS (SELECT 1 FROM service_providers p WHERE p.name = src.name);
