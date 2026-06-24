-- =========================================================================
-- Agent Management System — Module 2.4: Lead Assignment & Routing
--   • leads.assigned_at — when the lead was last (re)assigned to its agent.
--     (agent_id = current owner; assigned_admin_id = who assigned, from 057.)
--
--   Column add uses the MySQL-8 information_schema guard → safe to re-run.
-- =========================================================================

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'assigned_at');
SET @s := IF(@c = 0,
  'ALTER TABLE leads ADD COLUMN assigned_at DATETIME NULL AFTER assigned_admin_id',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
