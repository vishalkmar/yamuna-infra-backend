-- =========================================================================
-- Task 3c — Overdue / late-fee rule per property payment plan
--   When an installment crosses (due date + grace days) and is still unpaid,
--   a charge accrues. Charge is flat or a % of the installment amount.
--   Mode:
--     • 'final'    — folded into the running outstanding right away
--     • 'separate' — tracked as a separate bucket the client clears at the end
--   Charges are computed live from the current date (no cron needed).
--   Idempotent (MySQL 8).
-- =========================================================================

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_payment_plans' AND COLUMN_NAME = 'late_fee_enabled');
SET @s := IF(@c = 0,
  "ALTER TABLE property_payment_plans
     ADD COLUMN late_fee_enabled   TINYINT(1)   NOT NULL DEFAULT 0 AFTER notes,
     ADD COLUMN late_fee_grace_days INT         NOT NULL DEFAULT 0 AFTER late_fee_enabled,
     ADD COLUMN late_fee_type      ENUM('flat','percent') NOT NULL DEFAULT 'flat' AFTER late_fee_grace_days,
     ADD COLUMN late_fee_value     DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER late_fee_type,
     ADD COLUMN late_fee_mode      ENUM('final','separate') NOT NULL DEFAULT 'separate' AFTER late_fee_value",
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
