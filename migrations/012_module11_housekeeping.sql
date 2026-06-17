-- =========================================================================
-- Module 11 — Housekeeping & Domestic Assistance
--   Reuses the Home Services engine (Module 10). This migration only seeds
--   domestic-help providers under the 'housekeeping' category.
-- =========================================================================

INSERT INTO service_providers (category_id, name, tagline, phone, gender, rating, experience_years, price_from, active)
SELECT c.id, src.name, src.tagline, src.phone, src.gender, src.rating, src.exp, src.price, 1
FROM service_categories c
JOIN (
  SELECT 'housekeeping' AS cat, 'Sahayata Domestic Help' AS name, 'Live-in & part-time maids'        AS tagline, '9820010102' AS phone, 'female' AS gender, 4.6 AS rating, 6 AS exp,  9000.00 AS price UNION ALL
  SELECT 'housekeeping',        'GharSeva Maids',                'Daily cooking + cleaning combo',           '9820010103', 'female', 4.5, 4,  7500.00 UNION ALL
  SELECT 'housekeeping',        'Apna Ghar Attendants',          'Trained elder-care & baby-care help',      '9820010104', 'any',    4.7, 9, 12000.00 UNION ALL
  SELECT 'housekeeping',        'NeatNest Part-Time',            'Part-time utensils, mopping, dusting',     '9820010105', 'female', 4.3, 3,  4500.00
) src ON src.cat = c.code
WHERE NOT EXISTS (SELECT 1 FROM service_providers p WHERE p.name = src.name);
