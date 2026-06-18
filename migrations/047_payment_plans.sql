-- =========================================================================
-- Task 3 — Payment & Plan (per-property, admin-managed)
--   • property_payment_plans  — EMI-style plan set at resident creation
--   • property_installments   — generated schedule (paid/due/overdue/upcoming)
--   • property_payment_orders — online (Cashfree) order tracking per installment
--
--   Payments are recorded against an installment from two sources:
--     - online (resident pays via Cashfree in the app)
--     - cash / admin (office marks it paid at the counter)
--   Either way the installment flips to paid and an email + notification fire.
--
--   Idempotent (MySQL 8) — safe to re-run.
-- =========================================================================

CREATE TABLE IF NOT EXISTS property_payment_plans (
  property_id        BIGINT UNSIGNED NOT NULL,
  total_amount       DECIMAL(15,2)   NOT NULL DEFAULT 0,   -- final/agreement value
  downpayment        DECIMAL(15,2)   NOT NULL DEFAULT 0,
  installment_count  INT             NOT NULL DEFAULT 0,
  installment_amount DECIMAL(15,2)   NOT NULL DEFAULT 0,
  frequency          ENUM('monthly','quarterly') NOT NULL DEFAULT 'monthly',
  first_due_date     DATE            NULL,
  start_date         DATE            NULL,                 -- booking / agreement date
  end_date           DATE            NULL,                 -- computed last due date
  notes              VARCHAR(500)    NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id),
  CONSTRAINT fk_ppp_property FOREIGN KEY (property_id) REFERENCES user_properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_installments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id  BIGINT UNSIGNED NOT NULL,
  seq          INT             NOT NULL DEFAULT 0,
  label        VARCHAR(120)    NOT NULL,
  amount       DECIMAL(15,2)   NOT NULL DEFAULT 0,
  due_date     DATE            NULL,
  is_paid      TINYINT(1)      NOT NULL DEFAULT 0,
  paid_at      DATETIME        NULL,
  paid_amount  DECIMAL(15,2)   NULL,
  method       VARCHAR(40)     NULL,                       -- UPI / NetBanking / Cash / Cashfree
  source       ENUM('online','cash','admin') NULL,         -- who/where it was paid
  txn_id       VARCHAR(80)     NULL,
  recorded_by  VARCHAR(120)    NULL,                       -- admin name, or 'app'
  late_fee     DECIMAL(12,2)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pi_property (property_id, due_date),
  CONSTRAINT fk_pi_property FOREIGN KEY (property_id) REFERENCES user_properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_payment_orders (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id        BIGINT UNSIGNED NOT NULL,
  installment_id     BIGINT UNSIGNED NULL,
  user_id            BIGINT UNSIGNED NOT NULL,
  order_id           VARCHAR(80)     NOT NULL,
  cashfree_order_id  VARCHAR(120)    NULL,
  payment_session_id VARCHAR(255)    NULL,
  payment_link       VARCHAR(500)    NULL,
  amount             DECIMAL(15,2)   NOT NULL,
  status             ENUM('created','paid','failed','cancelled') NOT NULL DEFAULT 'created',
  paid_at            DATETIME        NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ppo_order (order_id),
  KEY idx_ppo_property (property_id)
) ENGINE=InnoDB;
