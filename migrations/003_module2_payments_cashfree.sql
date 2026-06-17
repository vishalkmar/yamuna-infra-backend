-- =========================================================================
-- Module 2 — Payment & Billing Dashboard (Cashfree integration)
--   • Adds Cashfree-specific columns to payment_orders
--   • Adds late_fees per installment + audit table
--   • Adds payment_webhook_events for raw Cashfree payloads
--   • Adds payment_reminders for scheduled FCM/SMS/WhatsApp dispatches
--   • Indexes for history searching
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----- 1. Cashfree-specific columns on payment_orders -----
ALTER TABLE payment_orders
  ADD COLUMN installment_id       BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN cashfree_order_id    VARCHAR(80)     NULL AFTER order_id,
  ADD COLUMN payment_session_id   VARCHAR(255)    NULL AFTER cashfree_order_id,
  ADD COLUMN payment_link         VARCHAR(500)    NULL AFTER payment_session_id,
  ADD COLUMN currency             CHAR(3)         NOT NULL DEFAULT 'INR' AFTER amount,
  ADD COLUMN environment          ENUM('sandbox','production') NOT NULL DEFAULT 'sandbox' AFTER status,
  ADD COLUMN failure_reason       VARCHAR(255)    NULL AFTER paid_at,
  ADD COLUMN raw_response         JSON            NULL AFTER failure_reason;

CREATE INDEX idx_po_cashfree_order ON payment_orders (cashfree_order_id);
CREATE INDEX idx_po_status_created ON payment_orders (status, created_at);

-- ----- 2. Late fees on installments -----
ALTER TABLE installments
  ADD COLUMN late_fee            DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER amount,
  ADD COLUMN original_due_date   DATE          NULL AFTER due_date,
  ADD COLUMN last_reminded_at    DATETIME      NULL AFTER status;

CREATE TABLE IF NOT EXISTS late_fee_events (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  installment_id  BIGINT UNSIGNED NOT NULL,
  booking_id      BIGINT UNSIGNED NOT NULL,
  amount          DECIMAL(15,2)   NOT NULL,
  reason          VARCHAR(200)    NULL,
  applied_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lfe_inst (installment_id),
  CONSTRAINT fk_lfe_inst    FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE,
  CONSTRAINT fk_lfe_booking FOREIGN KEY (booking_id)     REFERENCES bookings(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- 3. Cashfree webhook events (raw payload audit) -----
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type     VARCHAR(60)     NOT NULL,
  cashfree_order_id VARCHAR(80)  NULL,
  signature_valid TINYINT(1)     NOT NULL DEFAULT 0,
  payload        JSON            NOT NULL,
  processed_at   DATETIME        NULL,
  process_error  TEXT            NULL,
  received_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pwe_order  (cashfree_order_id),
  KEY idx_pwe_type   (event_type, received_at)
) ENGINE=InnoDB;

-- ----- 4. Scheduled payment reminders (FCM / SMS / WhatsApp) -----
CREATE TABLE IF NOT EXISTS payment_reminders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  installment_id  BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  channel         ENUM('push','sms','whatsapp','email') NOT NULL,
  rule            ENUM('t-7d','t-3d','due_date','overdue') NOT NULL,
  send_at         DATETIME        NOT NULL,
  status          ENUM('queued','sent','failed','cancelled') NOT NULL DEFAULT 'queued',
  provider_id     VARCHAR(120)    NULL,
  sent_at         DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pr_due (status, send_at),
  CONSTRAINT fk_pr_inst FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_user FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- 5. Receipts table — finalised receipts after successful payment -----
CREATE TABLE IF NOT EXISTS payment_receipts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id      BIGINT UNSIGNED NOT NULL,
  receipt_code    VARCHAR(40)     NOT NULL,
  pdf_path        VARCHAR(500)    NULL,
  sent_to_email   VARCHAR(180)    NULL,
  sent_to_whatsapp VARCHAR(20)    NULL,
  generated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_receipt_code (receipt_code),
  CONSTRAINT fk_pr_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- 6. Speed up payment history search -----
ALTER TABLE payments
  ADD COLUMN cashfree_order_id VARCHAR(80) NULL AFTER txn_id,
  ADD COLUMN remarks           VARCHAR(200) NULL AFTER status;

CREATE INDEX idx_payments_txn ON payments (txn_id);
CREATE INDEX idx_payments_method ON payments (method, paid_at);

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- SEED — wire up demo data
-- =========================================================================

-- Mark BK-2024-00421's "Slab Casting" as overdue if its due date has passed.
-- (Idempotent: only changes rows that are currently 'due' but should be 'overdue'.)
UPDATE installments
SET status = 'overdue'
WHERE booking_id = (SELECT id FROM bookings WHERE booking_code = 'BK-2024-00421')
  AND status = 'due'
  AND due_date < CURDATE();

-- Backfill original_due_date for installments that don't have it yet
UPDATE installments
SET original_due_date = due_date
WHERE original_due_date IS NULL;

-- Seed a historical successful payment so History tab is not empty
INSERT INTO payments (booking_id, installment_id, txn_id, amount, method, status, paid_at, remarks)
SELECT b.id, i.id, 'TXN-DEMO-001', i.amount, 'NetBanking', 'success',
       TIMESTAMP(i.due_date, '10:30:00'),
       'Initial booking amount'
FROM bookings b
JOIN installments i ON i.booking_id = b.id AND i.label = 'Booking Amount'
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.txn_id = 'TXN-DEMO-001');

INSERT INTO payments (booking_id, installment_id, txn_id, amount, method, status, paid_at, remarks)
SELECT b.id, i.id, 'TXN-DEMO-002', i.amount, 'UPI', 'success',
       TIMESTAMP(i.due_date, '11:15:00'),
       'Foundation slab'
FROM bookings b
JOIN installments i ON i.booking_id = b.id AND i.label = 'Foundation'
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.txn_id = 'TXN-DEMO-002');

INSERT INTO payments (booking_id, installment_id, txn_id, amount, method, status, paid_at, remarks)
SELECT b.id, i.id, 'TXN-DEMO-003', i.amount, 'NetBanking', 'success',
       TIMESTAMP(i.due_date, '09:45:00'),
       'Plinth completion'
FROM bookings b
JOIN installments i ON i.booking_id = b.id AND i.label = 'Plinth'
WHERE b.booking_code = 'BK-2024-00421'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.txn_id = 'TXN-DEMO-003');
