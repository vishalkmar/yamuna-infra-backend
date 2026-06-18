-- =========================================================================
-- Task 3b — Payment plan: flexible frequency + loan math fields
--   • gap_months   — pay every 1 / 2 / 3 / 6 months
--   • monthly_amount — the per-month figure the admin enters; the actual
--     per-installment amount = monthly_amount × gap_months
--   • frequency widened to VARCHAR for free-form labels
--   Idempotent (MySQL 8).
-- =========================================================================

ALTER TABLE property_payment_plans MODIFY COLUMN frequency VARCHAR(20) NOT NULL DEFAULT 'monthly';

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_payment_plans' AND COLUMN_NAME = 'gap_months');
SET @s := IF(@c = 0,
  'ALTER TABLE property_payment_plans ADD COLUMN gap_months INT NOT NULL DEFAULT 1 AFTER frequency',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_payment_plans' AND COLUMN_NAME = 'monthly_amount');
SET @s := IF(@c = 0,
  'ALTER TABLE property_payment_plans ADD COLUMN monthly_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER installment_amount',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
