-- =========================================================================
-- Agent Management System — Module 1.1: Agent Auth & RBAC
--   • `agent_tiers` — channel-partner tier/category config (commission default)
--   • `agents`      — core agent profile + email/password login (separate auth
--                     domain from residents `users` and `admins`)
--   • Seeds 3 tiers (Silver/Gold/Platinum) + 1 active test agent so the agent
--     portal is usable immediately:
--         email:    agent@yamunainfra.com
--         password: Admin@123          ← CHANGE after first login
--   • Agent status: pending | active | suspended | rejected
--     (only `active` may log in; new self-registrations start `pending`).
--
--   New tables → naturally idempotent (CREATE TABLE IF NOT EXISTS + seed guards).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_tiers (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                   VARCHAR(40)     NOT NULL,
  name                   VARCHAR(120)    NOT NULL,
  description            VARCHAR(400)    NULL,
  default_commission_pct DECIMAL(5,2)    NOT NULL DEFAULT 0,   -- default % of deal value
  perks                  VARCHAR(500)    NULL,
  is_active              TINYINT(1)      NOT NULL DEFAULT 1,
  sort_order             INT             NOT NULL DEFAULT 0,
  created_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agent_tiers_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agents (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120)    NOT NULL,
  email          VARCHAR(180)    NOT NULL,
  phone          VARCHAR(15)     NULL,
  password_hash  VARCHAR(100)    NOT NULL,
  agent_type     ENUM('channel_partner','broker','in_house','freelancer')
                                 NOT NULL DEFAULT 'channel_partner',
  tier_id        BIGINT UNSIGNED NULL,
  company_name   VARCHAR(180)    NULL,
  referral_code  VARCHAR(20)     NULL,
  city           VARCHAR(80)     NULL,
  state          VARCHAR(80)     NULL,
  pan            VARCHAR(20)     NULL,
  gst            VARCHAR(20)     NULL,
  photo_url      VARCHAR(500)    NULL,
  status         ENUM('pending','active','suspended','rejected') NOT NULL DEFAULT 'pending',
  kyc_status     ENUM('none','pending','approved','rejected')    NOT NULL DEFAULT 'none',
  created_source ENUM('self','admin') NOT NULL DEFAULT 'self',
  admin_notes    VARCHAR(500)    NULL,
  reject_reason  VARCHAR(300)    NULL,
  last_login_at  DATETIME        NULL,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agents_email (email),
  UNIQUE KEY uk_agents_referral (referral_code),
  KEY idx_agents_status (status),
  KEY idx_agents_tier (tier_id),
  CONSTRAINT fk_agents_tier FOREIGN KEY (tier_id)
    REFERENCES agent_tiers (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---- seed tiers ------------------------------------------------------------
INSERT INTO agent_tiers (code, name, description, default_commission_pct, perks, sort_order)
SELECT 'silver', 'Silver', 'Entry tier for new channel partners.', 1.00, 'Standard support', 1
WHERE NOT EXISTS (SELECT 1 FROM agent_tiers t WHERE t.code = 'silver');

INSERT INTO agent_tiers (code, name, description, default_commission_pct, perks, sort_order)
SELECT 'gold', 'Gold', 'For consistent performers.', 1.50, 'Priority leads, faster payouts', 2
WHERE NOT EXISTS (SELECT 1 FROM agent_tiers t WHERE t.code = 'gold');

INSERT INTO agent_tiers (code, name, description, default_commission_pct, perks, sort_order)
SELECT 'platinum', 'Platinum', 'Top-tier partners.', 2.00, 'Dedicated RM, highest commission, exclusive inventory', 3
WHERE NOT EXISTS (SELECT 1 FROM agent_tiers t WHERE t.code = 'platinum');

-- ---- seed a default active test agent (password = 'Admin@123', bcrypt cost 10)
INSERT INTO agents
  (name, email, phone, password_hash, agent_type, tier_id, company_name,
   referral_code, city, state, status, kyc_status, created_source)
SELECT 'Test Agent', 'agent@yamunainfra.com', '9876500000',
       '$2a$10$wiOU52anPN5beK8SyuNpeeAk2.h.Q/eXZ7NJ4ifvs5PeCS6UHtr4S',
       'channel_partner',
       (SELECT id FROM agent_tiers WHERE code = 'gold' LIMIT 1),
       'Yamuna Realty', 'AGT-TEST01', 'Vrindavan', 'Uttar Pradesh',
       'active', 'approved', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM agents a WHERE a.email = 'agent@yamunainfra.com');
