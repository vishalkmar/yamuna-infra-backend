-- =========================================================================
-- Admin Portal — Module A6: Doctors & Healthcare
--   `doctors` had specialty as a free string. Adds a specialties table +
--   specialty_id link, plus photo/qualifications/slot-template fields.
--   appointments / medicine_orders tables already exist.
-- =========================================================================

CREATE TABLE IF NOT EXISTS specialties (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(40)     NOT NULL,
  name       VARCHAR(120)    NOT NULL,
  icon       VARCHAR(40)     NULL,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order INT             NOT NULL DEFAULT 0,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_specialties_code (code)
) ENGINE=InnoDB;

ALTER TABLE doctors
  ADD COLUMN specialty_id   BIGINT UNSIGNED NULL AFTER specialty,
  ADD COLUMN image_url      VARCHAR(255)    NULL AFTER name,
  ADD COLUMN qualifications VARCHAR(200)    NULL AFTER specialty_id,
  ADD COLUMN description    VARCHAR(500)    NULL AFTER qualifications,
  ADD COLUMN available_days VARCHAR(60)     NULL AFTER rating,
  ADD COLUMN slots          VARCHAR(400)    NULL AFTER available_days,
  ADD COLUMN sort_order     INT             NOT NULL DEFAULT 0 AFTER active;

-- ----- Seed specialties (matching the existing doctor strings) -----
INSERT INTO specialties (code, name, icon, sort_order)
SELECT s.code, s.name, s.icon, s.so FROM (
  SELECT 'general_physician' AS code, 'General Physician' AS name, '🩺' AS icon, 1 AS so UNION ALL
  SELECT 'cardiologist',            'Cardiologist',            '❤️', 2 UNION ALL
  SELECT 'orthopedic',              'Orthopedic',              '🦴', 3 UNION ALL
  SELECT 'diabetologist',           'Diabetologist',           '💉', 4 UNION ALL
  SELECT 'pediatrician',            'Pediatrician',            '👶', 5 UNION ALL
  SELECT 'physiotherapist',         'Physiotherapist',         '🤸', 6
) s
WHERE NOT EXISTS (SELECT 1 FROM specialties sp WHERE sp.code = s.code);

-- ----- Link existing doctors to specialties by name -----
UPDATE doctors d
JOIN specialties s ON s.name = d.specialty
SET d.specialty_id = s.id
WHERE d.specialty_id IS NULL;
