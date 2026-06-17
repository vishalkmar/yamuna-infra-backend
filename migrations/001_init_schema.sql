-- =========================================================================
-- Yamuna Infra Customer Experience – initial schema (MySQL 8+)
-- The migrate script connects to whichever DB is in .env (DB_NAME).
-- That DB must already exist and the user must own it.
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----- Core users & auth -----
CREATE TABLE IF NOT EXISTS users (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mobile              VARCHAR(15)     NOT NULL,
  name                VARCHAR(120)    NULL,
  email               VARCHAR(180)    NULL,
  primary_booking_id  VARCHAR(40)     NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_mobile (mobile)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS otps (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mobile      VARCHAR(15)     NOT NULL,
  code        VARCHAR(10)     NOT NULL,
  attempts    INT             NOT NULL DEFAULT 0,
  consumed    TINYINT(1)      NOT NULL DEFAULT 0,
  expires_at  DATETIME        NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otps_mobile_active (mobile, consumed, expires_at)
) ENGINE=InnoDB;

-- ----- Project & booking -----
CREATE TABLE IF NOT EXISTS projects (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20)     NOT NULL,
  name        VARCHAR(180)    NOT NULL,
  city        VARCHAR(80)     NULL,
  rera_no     VARCHAR(60)     NULL,
  description TEXT            NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_projects_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS relationship_managers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)    NOT NULL,
  phone       VARCHAR(15)     NOT NULL,
  email       VARCHAR(180)    NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_code      VARCHAR(40)     NOT NULL,
  project_id        BIGINT UNSIGNED NULL,
  rm_id             BIGINT UNSIGNED NULL,
  unit_number       VARCHAR(40)     NOT NULL,
  tower             VARCHAR(40)     NULL,
  floor             VARCHAR(40)     NULL,
  area_sqft         DECIMAL(10,2)   NULL,
  agreement_value   DECIMAL(15,2)   NOT NULL DEFAULT 0,
  allottee_names    VARCHAR(255)    NULL,
  booking_date      DATE            NULL,
  status            ENUM('booked','active','possession_ready','possessed','cancelled')
                                    NOT NULL DEFAULT 'active',
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookings_code (booking_code),
  KEY idx_bookings_project (project_id),
  CONSTRAINT fk_bookings_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_bookings_rm      FOREIGN KEY (rm_id)      REFERENCES relationship_managers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_owners (
  booking_id  BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  role        ENUM('primary','co_owner') NOT NULL DEFAULT 'primary',
  PRIMARY KEY (booking_id, user_id),
  CONSTRAINT fk_bo_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bo_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- Documents -----
CREATE TABLE IF NOT EXISTS documents (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id   BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255)    NOT NULL,
  category     ENUM('agreement','invoice','receipt','noc','tax','other')
                               NOT NULL DEFAULT 'other',
  storage_path VARCHAR(500)    NOT NULL,
  file_size    VARCHAR(20)     NULL,
  uploaded_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_docs_booking (booking_id),
  CONSTRAINT fk_docs_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- Payments -----
CREATE TABLE IF NOT EXISTS installments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  label      VARCHAR(120)    NOT NULL,
  amount     DECIMAL(15,2)   NOT NULL,
  due_date   DATE            NOT NULL,
  status     ENUM('paid','due','overdue','upcoming') NOT NULL DEFAULT 'upcoming',
  PRIMARY KEY (id),
  KEY idx_inst_booking (booking_id, due_date),
  CONSTRAINT fk_inst_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_orders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_code    VARCHAR(40)     NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  order_id        VARCHAR(60)     NOT NULL,
  gateway_txn_id  VARCHAR(120)    NULL,
  amount          DECIMAL(15,2)   NOT NULL,
  mode            VARCHAR(20)     NOT NULL,
  remarks         VARCHAR(200)    NULL,
  status          ENUM('created','paid','failed','cancelled') NOT NULL DEFAULT 'created',
  paid_at         DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payment_order_id (order_id),
  KEY idx_payment_booking (booking_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id  BIGINT UNSIGNED NOT NULL,
  installment_id BIGINT UNSIGNED NULL,
  txn_id      VARCHAR(60)     NOT NULL,
  amount      DECIMAL(15,2)   NOT NULL,
  method      VARCHAR(40)     NOT NULL,
  status      ENUM('success','failed','refunded') NOT NULL DEFAULT 'success',
  paid_at     DATETIME        NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pay_booking (booking_id, paid_at),
  CONSTRAINT fk_pay_booking     FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_installment FOREIGN KEY (installment_id) REFERENCES installments(id)
) ENGINE=InnoDB;

-- ----- Construction progress -----
CREATE TABLE IF NOT EXISTS project_milestones (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120)    NOT NULL,
  status      ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  weight      INT             NOT NULL DEFAULT 1,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_milestone_project (project_id),
  CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_updates (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id  BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(200)    NOT NULL,
  description TEXT            NULL,
  media_url   VARCHAR(500)    NULL,
  media_type  ENUM('image','video') NOT NULL DEFAULT 'image',
  posted_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_update_project (project_id, posted_at)
) ENGINE=InnoDB;

-- ----- Support & site visits -----
CREATE TABLE IF NOT EXISTS site_visits (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  booking_id      BIGINT UNSIGNED NULL,
  visit_date      DATE            NOT NULL,
  visit_time      TIME            NOT NULL,
  visit_type      VARCHAR(20)     NOT NULL,
  visitor_count   INT             NOT NULL DEFAULT 1,
  special_needs   VARCHAR(300)    NULL,
  preferred_lang  VARCHAR(20)     NULL,
  status          ENUM('booked','completed','cancelled','rescheduled') NOT NULL DEFAULT 'booked',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_site_visit_user (user_id, visit_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_tickets (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  booking_id   BIGINT UNSIGNED NULL,
  ticket_code  VARCHAR(20)     NOT NULL,
  category     VARCHAR(40)     NOT NULL,
  subject      VARCHAR(150)    NOT NULL,
  description  TEXT            NOT NULL,
  priority     ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  status       ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ticket_code (ticket_code),
  KEY idx_ticket_user (user_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id  BIGINT UNSIGNED NOT NULL,
  author     ENUM('user','agent') NOT NULL,
  body       TEXT            NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tm_ticket (ticket_id),
  CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- Possession & snags -----
CREATE TABLE IF NOT EXISTS possession_checklists (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id  BIGINT UNSIGNED NOT NULL,
  step        VARCHAR(120)    NOT NULL,
  completed   TINYINT(1)      NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_poss_booking (booking_id),
  CONSTRAINT fk_poss_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS snags (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id   BIGINT UNSIGNED NOT NULL,
  snag_code    VARCHAR(20)     NOT NULL,
  location     VARCHAR(60)     NOT NULL,
  defect_type  VARCHAR(40)     NOT NULL,
  description  TEXT            NOT NULL,
  severity     ENUM('minor','major','critical') NOT NULL DEFAULT 'minor',
  status       ENUM('open','in_progress','resolved','signed_off') NOT NULL DEFAULT 'open',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_snag_code (snag_code),
  KEY idx_snag_booking (booking_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS snag_photos (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  snag_id   BIGINT UNSIGNED NOT NULL,
  url       VARCHAR(500)    NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sp_snag FOREIGN KEY (snag_id) REFERENCES snags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- Resident services -----
CREATE TABLE IF NOT EXISTS service_categories (
  id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code  VARCHAR(40)     NOT NULL,
  name  VARCHAR(120)    NOT NULL,
  icon  VARCHAR(40)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_category_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_providers (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id  BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(120)    NOT NULL,
  phone        VARCHAR(15)     NOT NULL,
  gender       ENUM('male','female','any') NOT NULL DEFAULT 'any',
  rating       DECIMAL(2,1)    NULL,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_provider_category (category_id, active),
  CONSTRAINT fk_provider_category FOREIGN KEY (category_id) REFERENCES service_categories(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_bookings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  category_id    BIGINT UNSIGNED NOT NULL,
  provider_id    BIGINT UNSIGNED NULL,
  start_date     DATE            NOT NULL,
  frequency      ENUM('one_time','daily','weekly','monthly') NOT NULL DEFAULT 'one_time',
  preferred_time VARCHAR(40)     NULL,
  special_notes  VARCHAR(300)    NULL,
  gender_pref    ENUM('male','female','any') NOT NULL DEFAULT 'any',
  status         ENUM('booked','active','completed','cancelled') NOT NULL DEFAULT 'booked',
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_svc_booking_user (user_id, start_date),
  CONSTRAINT fk_svc_category FOREIGN KEY (category_id) REFERENCES service_categories(id),
  CONSTRAINT fk_svc_provider FOREIGN KEY (provider_id) REFERENCES service_providers(id)
) ENGINE=InnoDB;

-- ----- Healthcare -----
CREATE TABLE IF NOT EXISTS doctors (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(120)    NOT NULL,
  specialty VARCHAR(80)     NOT NULL,
  phone     VARCHAR(15)     NULL,
  active    TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS healthcare_appointments (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  doctor_id         BIGINT UNSIGNED NOT NULL,
  consultation_type ENUM('video','home','clinic') NOT NULL,
  patient_name      VARCHAR(120)    NOT NULL,
  patient_age       INT             NULL,
  symptoms          TEXT            NULL,
  scheduled_at      DATETIME        NOT NULL,
  status            ENUM('booked','completed','cancelled','no_show') NOT NULL DEFAULT 'booked',
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hc_appt_user (user_id, scheduled_at),
  CONSTRAINT fk_hc_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id)
) ENGINE=InnoDB;

-- ----- Temples & darshan -----
CREATE TABLE IF NOT EXISTS temples (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150)    NOT NULL,
  city         VARCHAR(80)     NOT NULL DEFAULT 'Vrindavan',
  rating       DECIMAL(2,1)    NULL,
  description  TEXT            NULL,
  open_time    TIME            NULL,
  close_time   TIME            NULL,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS darshan_bookings (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  visit_date      DATE            NOT NULL,
  visit_time_slot VARCHAR(40)     NOT NULL,
  transport_type  VARCHAR(40)     NOT NULL,
  persons         INT             NOT NULL DEFAULT 1,
  senior_citizens INT             NOT NULL DEFAULT 0,
  group_name      VARCHAR(100)    NULL,
  status          ENUM('booked','completed','cancelled') NOT NULL DEFAULT 'booked',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_darshan_user (user_id, visit_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS darshan_booking_temples (
  booking_id BIGINT UNSIGNED NOT NULL,
  temple_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (booking_id, temple_id),
  CONSTRAINT fk_db_booking FOREIGN KEY (booking_id) REFERENCES darshan_bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_db_temple  FOREIGN KEY (temple_id)  REFERENCES temples(id)
) ENGINE=InnoDB;

-- ----- Community, visitors, amenities -----
CREATE TABLE IF NOT EXISTS visitor_passes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  guest_name    VARCHAR(120)    NOT NULL,
  guest_phone   VARCHAR(15)     NOT NULL,
  visit_date    DATE            NOT NULL,
  visit_purpose VARCHAR(40)     NOT NULL,
  valid_till    DATE            NULL,
  vehicle_no    VARCHAR(20)     NULL,
  qr_token      VARCHAR(64)     NOT NULL,
  status        ENUM('active','used','expired','revoked') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_visitor_qr (qr_token),
  KEY idx_visitor_user (user_id, visit_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS amenities (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(120)    NOT NULL,
  capacity  INT             NULL,
  deposit   DECIMAL(10,2)   NULL DEFAULT 0,
  active    TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS amenity_bookings (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  amenity_id   BIGINT UNSIGNED NOT NULL,
  booking_date DATE            NOT NULL,
  time_slot    VARCHAR(40)     NOT NULL,
  occasion     VARCHAR(100)    NULL,
  guest_count  INT             NULL,
  status       ENUM('booked','completed','cancelled') NOT NULL DEFAULT 'booked',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ab_amenity_date (amenity_id, booking_date),
  CONSTRAINT fk_ab_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id)
) ENGINE=InnoDB;

-- ----- SOS, rewards, notifications -----
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120)    NOT NULL,
  phone       VARCHAR(15)     NOT NULL,
  relation    VARCHAR(40)     NOT NULL,
  is_primary  TINYINT(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_ec_user (user_id),
  CONSTRAINT fk_ec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sos_requests (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  lat         DECIMAL(10,7)   NULL,
  lng         DECIMAL(10,7)   NULL,
  status      ENUM('active','dispatched','resolved','cancelled') NOT NULL DEFAULT 'active',
  notes       TEXT            NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sos_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_accounts (
  user_id  BIGINT UNSIGNED NOT NULL,
  points   INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_reward_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS referrals (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_id     BIGINT UNSIGNED NOT NULL,
  referee_name    VARCHAR(120)    NOT NULL,
  referee_phone   VARCHAR(15)     NOT NULL,
  referee_email   VARCHAR(180)    NULL,
  interested_in   VARCHAR(40)     NULL,
  relationship    VARCHAR(40)     NULL,
  status          ENUM('submitted','contacted','converted','dropped') NOT NULL DEFAULT 'submitted',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(200)    NOT NULL,
  body        TEXT            NULL,
  category    VARCHAR(40)     NULL,
  read_at     DATETIME        NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, read_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Seed data: one project, one RM, one booking, installments
-- ============================================================

INSERT INTO projects (code, name, city, rera_no, description) VALUES
  ('VH', 'Vrindavan Heights', 'Vrindavan', 'UPRERA-XXXX', 'Premium senior living and family residences in Vrindavan.')
  ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO relationship_managers (id, name, phone, email) VALUES
  (1, 'Kunal Naskar', '9876543210', 'kunal@yamunainfra.com')
  ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO bookings (booking_code, project_id, rm_id, unit_number, tower, floor, area_sqft, agreement_value, allottee_names, booking_date, status)
SELECT 'BK-2024-00421', p.id, 1, 'T2-B-1204', 'Tower 2', '12th Floor', 1450.00, 12500000.00, 'Piyush Sharma + Anita Sharma', '2024-03-15', 'active'
FROM projects p WHERE p.code = 'VH'
ON DUPLICATE KEY UPDATE unit_number=VALUES(unit_number);

INSERT INTO installments (booking_id, label, amount, due_date, status)
SELECT b.id, x.label, x.amount, x.due_date, x.status FROM bookings b
JOIN (
  SELECT 'Booking Amount' AS label, 1000000 AS amount, '2024-03-15' AS due_date, 'paid' AS status UNION ALL
  SELECT 'Foundation',              1500000,              '2024-08-15',              'paid'      UNION ALL
  SELECT 'Plinth',                  1500000,              '2025-12-15',              'paid'      UNION ALL
  SELECT 'Slab Casting',            1250000,              '2026-06-25',              'due'       UNION ALL
  SELECT 'Brickwork',               1250000,              '2026-09-25',              'upcoming'  UNION ALL
  SELECT 'Plastering',              1250000,              '2026-12-25',              'upcoming'  UNION ALL
  SELECT 'Finishing',               2000000,              '2027-03-25',              'upcoming'  UNION ALL
  SELECT 'Possession',              2750000,              '2027-06-25',              'upcoming'
) x ON b.booking_code = 'BK-2024-00421';

INSERT INTO project_milestones (project_id, name, status, weight)
SELECT id, 'Foundation Completion', 'completed', 20 FROM projects WHERE code='VH'
UNION ALL SELECT id, 'Structure Completion',   'completed',   25 FROM projects WHERE code='VH'
UNION ALL SELECT id, 'Internal Finishing',     'in_progress', 25 FROM projects WHERE code='VH'
UNION ALL SELECT id, 'Landscaping',            'pending',     15 FROM projects WHERE code='VH'
UNION ALL SELECT id, 'Possession Readiness',   'pending',     15 FROM projects WHERE code='VH';
