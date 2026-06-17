-- =========================================================================
-- Module 15 — Doctor & Healthcare Booking
--   • Extends doctors (fee, experience, languages)
--   • Extends healthcare_appointments (code, time_slot)
--   • medicine_orders — medicine delivery requests
--   • Seeds doctors across specialties
--   (doctors + healthcare_appointments base tables already exist in 001)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE doctors
  ADD COLUMN experience_years INT           NULL AFTER specialty,
  ADD COLUMN fee              DECIMAL(8,2)  NULL AFTER experience_years,
  ADD COLUMN languages        VARCHAR(120)  NULL AFTER fee,
  ADD COLUMN rating           DECIMAL(2,1)  NULL AFTER languages;

ALTER TABLE healthcare_appointments
  ADD COLUMN appointment_code VARCHAR(20) NULL AFTER id,
  ADD COLUMN time_slot        VARCHAR(20) NULL AFTER scheduled_at;

CREATE UNIQUE INDEX uk_hc_appt_code ON healthcare_appointments (appointment_code);

CREATE TABLE IF NOT EXISTS medicine_orders (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  items         VARCHAR(500)    NOT NULL,
  delivery_note VARCHAR(150)    NULL,
  status        ENUM('placed','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'placed',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medorder_user (user_id, created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — doctors
-- =========================================================================

INSERT INTO doctors (name, specialty, experience_years, fee, languages, rating, phone, active)
SELECT src.name, src.specialty, src.exp, src.fee, src.langs, src.rating, src.phone, 1 FROM (
  SELECT 'Dr. Anjali Mehra'   AS name, 'General Physician' AS specialty, 12 AS exp, 600.00  AS fee, 'Hindi, English'           AS langs, 4.8 AS rating, '9830010001' AS phone UNION ALL
  SELECT 'Dr. Rakesh Gupta',         'Cardiologist',                  18,        1200.00,        'Hindi, English',                       4.9,        '9830010002' UNION ALL
  SELECT 'Dr. Sunita Rao',           'Orthopedic',                    15,        1000.00,        'Hindi, English, Marathi',              4.7,        '9830010003' UNION ALL
  SELECT 'Dr. Imran Khan',           'Diabetologist',                 10,        900.00,         'Hindi, English, Urdu',                 4.6,        '9830010004' UNION ALL
  SELECT 'Dr. Priya Nair',           'Pediatrician',                  14,        800.00,         'Hindi, English, Malayalam',            4.8,        '9830010005' UNION ALL
  SELECT 'Dr. Vikram Joshi',         'Physiotherapist',               9,         700.00,         'Hindi, English',                       4.5,        '9830010006'
) src
WHERE NOT EXISTS (SELECT 1 FROM doctors d WHERE d.name = src.name);
