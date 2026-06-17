-- =========================================================================
-- Admin Portal — Module A1: Admin Auth & RBAC
--   • `admins` table (separate from resident `users`; email + password login)
--   • Seeds a default superadmin so the portal is usable immediately
--       email:    admin@yamunainfra.com
--       password: Admin@123      ← CHANGE THIS after first login (A1.5)
--   • Roles: superadmin | manager | support
-- =========================================================================

CREATE TABLE IF NOT EXISTS admins (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)    NOT NULL,
  email         VARCHAR(180)    NOT NULL,
  password_hash VARCHAR(100)    NOT NULL,
  role          ENUM('superadmin','manager','support') NOT NULL DEFAULT 'manager',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at DATETIME        NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admins_email (email)
) ENGINE=InnoDB;

-- Seed the default superadmin (bcryptjs hash of 'Admin@123', cost 10).
INSERT INTO admins (name, email, password_hash, role, is_active)
SELECT 'Super Admin', 'admin@yamunainfra.com',
       '$2a$10$wiOU52anPN5beK8SyuNpeeAk2.h.Q/eXZ7NJ4ifvs5PeCS6UHtr4S', 'superadmin', 1
WHERE NOT EXISTS (SELECT 1 FROM admins a WHERE a.email = 'admin@yamunainfra.com');
