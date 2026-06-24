/* One-off demo seeder for the AMS test agent — fills every agent-dashboard
 * section with sample data. Idempotent: skips if the demo project already exists.
 * Run: node src/scripts/seedAgentDemo.js
 */
const { pool } = require('../config/db');

const dedupe = p => (String(p || '').replace(/\D/g, '').slice(-10) || null);

(async () => {
  const [ag] = await pool.query("SELECT id, tier_id FROM agents WHERE email = 'agent@yamunainfra.com' LIMIT 1");
  if (!ag[0]) { console.log('Seed agent not found — run migrate first.'); process.exit(1); }
  const agentId = ag[0].id;
  const tierId = ag[0].tier_id;

  const [existing] = await pool.query("SELECT id FROM agent_projects WHERE name = 'Demo Heights' LIMIT 1");
  if (existing[0]) { console.log('Demo data already seeded. Nothing to do.'); process.exit(0); }

  // ---- Project + tower + units ----
  const [p] = await pool.query(
    `INSERT INTO agent_projects (name, location, city, state, status, rera_no, description, price_from, price_to, is_active, sort_order)
     VALUES ('Demo Heights','Vrindavan Road','Vrindavan','Uttar Pradesh','ongoing','RERA-DEMO-001','Premium 2 & 3 BHK riverside residences.',4500000,9500000,1,1)`);
  const projectId = p.insertId;
  const [t] = await pool.query(`INSERT INTO project_towers (project_id, name, total_floors, sort_order) VALUES (?, 'Tower A', 12, 1)`, [projectId]);
  const towerId = t.insertId;

  const units = [];
  const mk = (no, floor, type, area, price, status, facing) => units.push([projectId, towerId, no, floor, type, area, price, facing, status]);
  mk('101','1','2BHK',1050,4800000,'available','East');
  mk('102','1','2BHK',1050,4800000,'available','West');
  mk('201','2','3BHK',1450,7200000,'available','East');
  mk('202','2','3BHK',1450,7200000,'available','North');
  mk('301','3','3BHK',1500,7600000,'blocked','East');
  const [u] = await pool.query(
    `INSERT INTO units (project_id, tower_id, unit_no, floor, unit_type, area_sqft, base_price, facing, status) VALUES ?`, [units]);
  // a held unit (held by this agent) + a sold unit (for the booking)
  const [uh] = await pool.query(
    `INSERT INTO units (project_id, tower_id, unit_no, floor, unit_type, area_sqft, base_price, facing, status, hold_until, held_by_agent_id)
     VALUES (?, ?, '302','3','3BHK',1500,7600000,'West','held', DATE_ADD(NOW(), INTERVAL 48 HOUR), ?)`, [projectId, towerId, agentId]);
  const [us] = await pool.query(
    `INSERT INTO units (project_id, tower_id, unit_no, floor, unit_type, area_sqft, base_price, facing, status)
     VALUES (?, ?, '401','4','3BHK',1480,7400000,'East','sold')`, [projectId, towerId]);
  const soldUnitId = us.insertId;

  // ---- Commission rule (global 1.5%) ----
  await pool.query(
    `INSERT INTO commission_rules (name, scope_type, calc_type, value, priority, is_active)
     VALUES ('Standard 1.5%','global','percent',1.5,1,1)`);

  // ---- Leads across stages ----
  const leadRows = [
    ['Rahul Verma','9811100001','rahul@example.com','online','new',5000000,'2BHK ready-to-move'],
    ['Sneha Gupta','9811100002','sneha@example.com','referral','contacted',7000000,'3BHK east facing'],
    ['Amit Shah','9811100003','amit@example.com','walk_in','site_visit',7500000,'3BHK higher floor'],
    ['Pooja Rao','9811100004','pooja@example.com','call','negotiation',7200000,'3BHK, close deal'],
    ['Vikas Nair','9811100005','vikas@example.com','social','booked',7400000,'Booked 401'],
    ['Neha Jain','9811100006','neha@example.com','other','lost',4000000,'Budget mismatch'],
  ];
  const leadIds = {};
  for (const [name, phone, email, source, stage, budget, req] of leadRows) {
    const [r] = await pool.query(
      `INSERT INTO leads (agent_id, name, phone, email, source, project_id, budget, requirement, stage, dedupe_key, owner_lock_until, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY), NOW())`,
      [agentId, name, phone, email, source, projectId, budget, req, stage, dedupe(phone)]);
    leadIds[stage] = r.insertId;
    if (stage !== 'new') {
      await pool.query(
        `INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by_type, changed_by_name, note)
         VALUES (?, 'new', ?, 'agent', 'Test Agent', 'Demo move')`, [r.insertId, stage]);
    }
  }

  // ---- Task + note on the negotiation lead ----
  await pool.query(
    `INSERT INTO lead_tasks (lead_id, agent_id, title, notes, due_at, created_by_type, created_by_name)
     VALUES (?, ?, 'Call back with final price', 'Wants 2% discount', DATE_ADD(NOW(), INTERVAL 1 DAY), 'agent', 'Test Agent')`,
    [leadIds.negotiation, agentId]);
  await pool.query(
    `INSERT INTO lead_notes (lead_id, body, by_type, by_name) VALUES (?, 'Very interested, visiting Sunday.', 'agent', 'Test Agent')`,
    [leadIds.site_visit]);

  // ---- Site visit (confirmed) ----
  await pool.query(
    `INSERT INTO agent_site_visits (lead_id, agent_id, project_id, scheduled_at, slot, status, created_by_type, created_by_name)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Morning (10–12)', 'confirmed', 'agent', 'Test Agent')`,
    [leadIds.site_visit, agentId, projectId]);

  // ---- Booking (approved) on the sold unit ----
  const [bk] = await pool.query(
    `INSERT INTO agent_bookings (lead_id, agent_id, project_id, unit_id, buyer_name, buyer_phone, buyer_email, deal_value, booking_amount, status, approved_by, approved_at, created_by_type, created_by_name)
     VALUES (?, ?, ?, ?, 'Vikas Nair','9811100005','vikas@example.com',7400000,200000,'approved','Super Admin',NOW(),'agent','Test Agent')`,
    [leadIds.booked, agentId, projectId, soldUnitId]);
  const bookingId = bk.insertId;

  // ---- Commission ledger: one approved (from booking) + one paid (history) ----
  await pool.query(
    `INSERT INTO commission_ledger (agent_id, booking_id, deal_value, amount, status, rule_snapshot)
     VALUES (?, ?, 7400000, 111000, 'approved', 'Standard 1.5% — 1.5%')`, [agentId, bookingId]);
  const [paidLedger] = await pool.query(
    `INSERT INTO commission_ledger (agent_id, deal_value, amount, status, rule_snapshot, notes)
     VALUES (?, 5000000, 75000, 'paid', 'Standard 1.5% — 1.5%', 'Earlier deal')`, [agentId]);

  // ---- Payout (paid) tied to the paid ledger ----
  const [po] = await pool.query(
    `INSERT INTO payout_requests (agent_id, amount, tds, net, status, method, txn_ref, processed_by, processed_at)
     VALUES (?, 75000, 3750, 71250, 'paid', 'NEFT', 'TXN-DEMO-77', 'Super Admin', NOW())`, [agentId]);
  await pool.query(`UPDATE commission_ledger SET payout_id = ? WHERE id = ?`, [po.insertId, paidLedger.insertId]);

  // ---- Target (this month) ----
  await pool.query(
    `INSERT INTO agent_targets (agent_id, title, metric, target_value, period_start, period_end, incentive_amount, status)
     VALUES (?, 'Monthly sales target', 'deal_value', 15000000, DATE_FORMAT(CURDATE(),'%Y-%m-01'), LAST_DAY(CURDATE()), 25000, 'active')`,
    [agentId]);

  // ---- Notification (broadcast) ----
  const [nb] = await pool.query(
    `INSERT INTO agent_notification_batches (title, body, audience, sent_count, created_by) VALUES ('New launch: Demo Heights','Bookings open — earn 1.5% commission.','all',1,'Super Admin')`);
  await pool.query(
    `INSERT INTO agent_notifications (agent_id, batch_id, title, body) VALUES (?, ?, 'New launch: Demo Heights','Bookings open — earn 1.5% commission.')`,
    [agentId, nb.insertId]);

  // ---- Announcement (news) ----
  await pool.query(
    `INSERT INTO agent_announcements (title, body, is_pinned, is_active, created_by)
     VALUES ('Diwali incentive scheme', 'Extra 0.5% on every booking this festive season!', 1, 1, 'Super Admin')`);

  // ---- Resources: collateral + training ----
  await pool.query(
    `INSERT INTO agent_resources (kind, category, title, description, url, file_type, is_active, sort_order)
     VALUES ('collateral','Brochures','Demo Heights Brochure','Full project brochure PDF','https://example.com/brochure.pdf','pdf',1,1),
            ('training','Onboarding','How to register a lead','Step-by-step guide','https://example.com/guide.pdf','pdf',1,1)`);

  // ---- Support ticket + messages ----
  const [tk] = await pool.query(
    `INSERT INTO agent_tickets (agent_id, subject, category, status, last_message_at) VALUES (?, 'Payout not received', 'Payout', 'in_progress', NOW())`,
    [agentId]);
  await pool.query(
    `INSERT INTO agent_ticket_messages (ticket_id, sender_type, sender_name, body) VALUES
       (?, 'agent', 'Test Agent', 'My last payout is still pending.'),
       (?, 'admin', 'Super Admin', 'It is processing, will reflect in 24h.')`, [tk.insertId, tk.insertId]);

  // ---- Message templates ----
  await pool.query(
    `INSERT INTO lead_message_templates (channel, title, subject, body, is_active, sort_order) VALUES
       ('whatsapp','Intro', NULL, 'Hi {{name}}, thanks for your interest in {{project}}. Can we schedule a visit?', 1, 1),
       ('email','Brochure', 'Your {{project}} details', 'Dear {{name}}, please find the brochure and price list attached.', 1, 2)`);

  // ---- Bank details (verified) ----
  await pool.query(
    `INSERT INTO agent_bank_details (agent_id, account_holder, account_number, ifsc, bank_name, branch, account_type, upi_id, verified, verified_by, verified_at)
     VALUES (?, 'Test Agent', '123456789012', 'HDFC0001234', 'HDFC Bank', 'Vrindavan', 'savings', 'testagent@upi', 1, 'Super Admin', NOW())
     ON DUPLICATE KEY UPDATE verified = 1`, [agentId]);

  // ---- KYC document (approved) + agent kyc approved ----
  await pool.query(
    `INSERT INTO agent_documents (agent_id, doc_type, label, url, status, reviewed_by, reviewed_at)
     VALUES (?, 'pan', 'PAN Card', 'https://example.com/pan.jpg', 'approved', 'Super Admin', NOW())`, [agentId]);
  await pool.query(`UPDATE agents SET kyc_status = 'approved', kyc_reviewed_at = NOW() WHERE id = ?`, [agentId]);

  // ---- A couple of activity log rows ----
  await pool.query(
    `INSERT INTO agent_activity_log (agent_id, action, entity, path, status_code) VALUES
       (?, 'LOGIN', 'auth', '/api/agent/auth/login', 200),
       (?, 'POST', 'leads', '/api/agent/leads', 201)`, [agentId, agentId]);

  console.log('✓ Demo data seeded for agent@yamunainfra.com');
  console.log(`  project #${projectId}, ${units.length + 2} units, ${leadRows.length} leads, 1 visit, 1 booking, commission + payout + target, notifications/news/resources/ticket/templates/bank/KYC.`);
  process.exit(0);
})().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
