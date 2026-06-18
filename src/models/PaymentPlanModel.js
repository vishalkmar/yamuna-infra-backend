const { pool } = require('../config/db');

// ---- date helpers (work on YYYY-MM-DD strings; pool uses dateStrings:true) ----
function iso(d) { return d ? String(d).slice(0, 10) : null; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function addMonths(dateStr, n) {
  // UTC-safe so dates never drift across timezones.
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDate();
  dt.setUTCMonth(dt.getUTCMonth() + n);
  if (dt.getUTCDate() < day) dt.setUTCDate(0); // clamp month overflow (e.g. Jan 31 + 1)
  return dt.toISOString().slice(0, 10);
}
function round2(n) { return Math.round(Number(n) * 100) / 100; }
// Whole days from bStr to aStr (a - b), UTC-safe.
function daysBetween(aStr, bStr) {
  const [ay, am, ad] = String(aStr).slice(0, 10).split('-').map(Number);
  const [by, bm, bd] = String(bStr).slice(0, 10).split('-').map(Number);
  return Math.floor((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000);
}

// Derive the display status of an unpaid installment relative to today.
function statusOf(row, today, soon) {
  if (row.is_paid) return 'paid';
  const due = iso(row.due_date);
  if (!due) return 'upcoming';
  if (due < today) return 'overdue';
  if (due <= soon) return 'due';
  return 'upcoming';
}

function shapeInstallment(row, today, soon) {
  return {
    id: row.id,
    seq: row.seq,
    label: row.label,
    amount: Number(row.amount),
    dueDate: iso(row.due_date),
    status: statusOf(row, today, soon),
    isPaid: !!row.is_paid,
    paidAt: row.paid_at ? iso(row.paid_at) : null,
    paidAmount: row.paid_amount != null ? Number(row.paid_amount) : null,
    method: row.method,
    source: row.source,
    txnId: row.txn_id,
    lateFee: Number(row.late_fee || 0),
  };
}

const PaymentPlanModel = {
  async getPlan(propertyId) {
    const [[p]] = await pool.query(
      `SELECT property_id AS propertyId, total_amount AS totalAmount, downpayment,
              installment_count AS installmentCount, installment_amount AS installmentAmount,
              monthly_amount AS monthlyAmount, gap_months AS gapMonths,
              frequency, first_due_date AS firstDueDate, start_date AS startDate,
              end_date AS endDate, notes,
              late_fee_enabled AS lateFeeEnabled, late_fee_grace_days AS lateFeeGraceDays,
              late_fee_type AS lateFeeType, late_fee_value AS lateFeeValue, late_fee_mode AS lateFeeMode
       FROM property_payment_plans WHERE property_id = ? LIMIT 1`, [propertyId],
    );
    return p || null;
  },

  async getInstallmentsRaw(propertyId) {
    const [rows] = await pool.query(
      `SELECT * FROM property_installments WHERE property_id = ? ORDER BY seq ASC, due_date ASC, id ASC`,
      [propertyId],
    );
    return rows;
  },

  async getInstallments(propertyId) {
    const rows = await this.getInstallmentsRaw(propertyId);
    const today = todayStr();
    const soon = addMonths(today, 0); // placeholder; compute soon = today + 7 days below
    const soonDate = new Date(); soonDate.setDate(soonDate.getDate() + 7);
    const soonStr = soonDate.toISOString().slice(0, 10);
    return rows.map(r => shapeInstallment(r, today, soonStr));
  },

  // Pure loan-math: derive the full plan from the admin's inputs. Stable in
  // every case (handles monthly-amount OR explicit count, gap frequency, and
  // a balance that doesn't divide evenly — the last installment absorbs the
  // remainder).
  computePlan(d) {
    const total = Number(d.totalAmount) || 0;
    const down = Number(d.downpayment) || 0;
    const balance = round2(Math.max(0, total - down));
    const G = [1, 2, 3, 6].includes(Number(d.gapMonths)) ? Number(d.gapMonths) : 1;

    let monthly = Number(d.monthlyAmount) || 0;
    let count = 0;
    let per = 0;

    if (monthly > 0 && balance > 0) {
      const months = Math.min(600, Math.ceil(balance / monthly)); // total months at monthly rate
      count = Math.max(1, Math.ceil(months / G));                 // actual payments (each spans G months)
      per = round2(monthly * G);
    } else if (Number(d.installmentCount) > 0 && balance > 0) {
      count = Math.min(600, Number(d.installmentCount));
      per = round2(balance / count);
      monthly = round2(per / G);
    }
    // A single bullet payment if the balance is smaller than one installment.
    if (balance > 0 && count > 0 && per > balance) { count = 1; per = balance; }

    const endDate = (d.firstDueDate && count > 0) ? addMonths(iso(d.firstDueDate), (count - 1) * G) : null;
    const FREQ = { 1: 'monthly', 2: 'every 2 months', 3: 'quarterly', 6: 'every 6 months' };
    return { total, down, balance, gap: G, monthly, count, per, endDate, frequency: FREQ[G] };
  },

  // Save / replace the plan row (with derived loan math).
  async upsertPlan(propertyId, d) {
    const c = this.computePlan(d);
    await pool.query(
      `INSERT INTO property_payment_plans
        (property_id, total_amount, downpayment, installment_count, installment_amount,
         monthly_amount, gap_months, frequency, first_due_date, start_date, end_date, notes,
         late_fee_enabled, late_fee_grace_days, late_fee_type, late_fee_value, late_fee_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_amount=VALUES(total_amount), downpayment=VALUES(downpayment),
         installment_count=VALUES(installment_count), installment_amount=VALUES(installment_amount),
         monthly_amount=VALUES(monthly_amount), gap_months=VALUES(gap_months),
         frequency=VALUES(frequency), first_due_date=VALUES(first_due_date), start_date=VALUES(start_date),
         end_date=VALUES(end_date), notes=VALUES(notes),
         late_fee_enabled=VALUES(late_fee_enabled), late_fee_grace_days=VALUES(late_fee_grace_days),
         late_fee_type=VALUES(late_fee_type), late_fee_value=VALUES(late_fee_value), late_fee_mode=VALUES(late_fee_mode)`,
      [propertyId, c.total, c.down, c.count, c.per, c.monthly, c.gap, c.frequency,
       iso(d.firstDueDate), iso(d.startDate), c.endDate, d.notes || null,
       d.lateFeeEnabled ? 1 : 0, Number(d.lateFeeGraceDays) || 0,
       d.lateFeeType === 'percent' ? 'percent' : 'flat', Number(d.lateFeeValue) || 0,
       d.lateFeeMode === 'final' ? 'final' : 'separate'],
    );
    return this.getPlan(propertyId);
  },

  // Build the installment schedule from the plan. Wipes existing installments
  // (admin is warned). Downpayment becomes a paid row; the balance is split
  // into `installmentCount` equal monthly installments (last one absorbs the
  // rounding remainder so the totals tie out exactly).
  async generateInstallments(propertyId) {
    const plan = await this.getPlan(propertyId);
    if (!plan) return [];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM property_installments WHERE property_id = ?', [propertyId]);

      const total = Number(plan.totalAmount) || 0;
      const down = Number(plan.downpayment) || 0;
      const count = Number(plan.installmentCount) || 0;
      const step = [1, 2, 3, 6].includes(Number(plan.gapMonths)) ? Number(plan.gapMonths) : 1;

      if (down > 0) {
        await conn.query(
          `INSERT INTO property_installments
            (property_id, seq, label, amount, due_date, is_paid, paid_at, paid_amount, method, source, recorded_by)
           VALUES (?, 0, 'Down payment', ?, ?, 1, ?, ?, 'Booking', 'admin', 'system')`,
          [propertyId, down, iso(plan.startDate) || iso(plan.firstDueDate),
           (iso(plan.startDate) || iso(plan.firstDueDate)) + ' 00:00:00', down],
        );
      }

      const balance = round2(total - down);
      const each = count > 0 ? round2(balance / count) : 0;
      let allocated = 0;
      for (let k = 1; k <= count; k++) {
        const isLast = k === count;
        const amt = isLast ? round2(balance - allocated) : each;
        allocated = round2(allocated + amt);
        const due = plan.firstDueDate ? addMonths(iso(plan.firstDueDate), (k - 1) * step) : null;
        await conn.query(
          `INSERT INTO property_installments (property_id, seq, label, amount, due_date)
           VALUES (?, ?, ?, ?, ?)`,
          [propertyId, k, `Installment ${k} of ${count}`, amt, due],
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return this.getInstallments(propertyId);
  },

  // ---- summaries / app payloads ----
  async getSummary(propertyId) {
    const plan = await this.getPlan(propertyId);
    const installments = await this.getInstallments(propertyId);
    const today = todayStr();

    // Live late-fee accrual: any unpaid installment past (due + grace) accrues a
    // charge. Stamp each installment's lateFee so the app/invoice can show it.
    const rule = plan && plan.lateFeeEnabled ? {
      grace: Number(plan.lateFeeGraceDays) || 0,
      type: plan.lateFeeType || 'flat',
      value: Number(plan.lateFeeValue) || 0,
      mode: plan.lateFeeMode || 'separate',
    } : null;
    let lateCharges = 0;
    let lateCount = 0;
    for (const i of installments) {
      i.lateFee = 0;
      if (rule && rule.value > 0 && !i.isPaid && i.dueDate) {
        const overdueDays = daysBetween(today, i.dueDate);
        if (overdueDays > rule.grace) {
          const fee = rule.type === 'percent' ? round2((rule.value / 100) * i.amount) : round2(rule.value);
          i.lateFee = fee;
          i.overdueDays = overdueDays;
          lateCharges = round2(lateCharges + fee);
          lateCount += 1;
        }
      }
    }

    const totalPaid = installments.filter(i => i.isPaid).reduce((s, i) => s + (i.paidAmount ?? i.amount), 0);
    const totalAgreementValue = plan ? Number(plan.totalAmount) : installments.reduce((s, i) => s + i.amount, 0);
    const installmentOutstanding = round2(installments.filter(i => !i.isPaid).reduce((s, i) => s + i.amount, 0));
    // 'final' mode folds late charges into the live outstanding; 'separate' keeps
    // them in their own bucket (cleared after all installments are paid).
    const lateMode = rule ? rule.mode : 'separate';
    const outstanding = lateMode === 'final' ? round2(installmentOutstanding + lateCharges) : installmentOutstanding;
    const totalPayable = round2(installmentOutstanding + lateCharges);
    const pendingCount = installments.filter(i => !i.isPaid).length;
    const nextDue = installments.filter(i => !i.isPaid).sort((a, b) => (a.dueDate || '') < (b.dueDate || '') ? -1 : 1)[0] || null;

    return {
      plan, installments,
      paid: installments.filter(i => i.isPaid),
      overdue: installments.filter(i => i.status === 'overdue'),
      due: installments.filter(i => i.status === 'due'),
      upcoming: installments.filter(i => i.status === 'upcoming'),
      totalPaid: round2(totalPaid), totalAgreementValue: round2(totalAgreementValue),
      installmentOutstanding, outstanding, lateCharges, lateCount, lateMode, totalPayable,
      pendingCount, nextDue,
      progressPct: totalAgreementValue > 0 ? Math.round((totalPaid / totalAgreementValue) * 100) : 0,
    };
  },

  async getSchedule(propertyId) {
    const s = await this.getSummary(propertyId);
    return {
      nextDue: s.nextDue, installments: s.installments, outstanding: s.outstanding,
      pendingCount: s.pendingCount, lateCharges: s.lateCharges, lateMode: s.lateMode,
      totalPayable: s.totalPayable,
    };
  },

  async getHistory(propertyId, { search, method } = {}) {
    const installments = await this.getInstallments(propertyId);
    let paid = installments.filter(i => i.isPaid);
    if (method) paid = paid.filter(p => (p.method || '').toLowerCase() === method.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      paid = paid.filter(p => `${p.txnId || ''} ${p.label}`.toLowerCase().includes(q));
    }
    return paid
      .sort((a, b) => (a.paidAt || '') < (b.paidAt || '') ? 1 : -1)
      .map(p => ({
        id: p.id, installmentLabel: p.label, txnId: p.txnId || `INST-${p.id}`,
        date: p.paidAt, method: p.method || 'Cash', amount: p.paidAmount ?? p.amount,
        source: p.source, status: 'success',
      }));
  },

  async getLedger(propertyId) {
    const s = await this.getSummary(propertyId);
    return {
      summary: {
        totalAgreementValue: s.totalAgreementValue,
        totalPaid: s.totalPaid,
        outstanding: s.outstanding,
        lateCharges: s.lateCharges,
        totalPayable: s.totalPayable,
        nextDue: s.nextDue,
        paidCount: s.paid.length,
        overdueCount: s.overdue.length,
        progressPct: s.progressPct,
      },
      payments: s.installments.filter(i => i.isPaid).map(p => ({
        id: p.id, installmentLabel: p.label, txnId: p.txnId || `INST-${p.id}`,
        method: p.method || 'Cash', amount: p.paidAmount ?? p.amount, paidAt: p.paidAt, source: p.source,
      })),
    };
  },

  // ---- mutations ----
  async getInstallmentById(installmentId) {
    const [[row]] = await pool.query('SELECT * FROM property_installments WHERE id = ? LIMIT 1', [installmentId]);
    return row || null;
  },

  async installmentProperty(installmentId) {
    const [[row]] = await pool.query('SELECT property_id AS propertyId FROM property_installments WHERE id = ? LIMIT 1', [installmentId]);
    return row ? row.propertyId : null;
  },

  async markPaid(installmentId, { method, source, txnId, recordedBy, paidAt, amount } = {}) {
    const inst = await this.getInstallmentById(installmentId);
    if (!inst) return false;
    const [r] = await pool.query(
      `UPDATE property_installments SET
         is_paid = 1, paid_at = ?, paid_amount = ?, method = ?, source = ?, txn_id = ?, recorded_by = ?
       WHERE id = ?`,
      [paidAt || new Date(), amount != null ? amount : inst.amount,
       method || 'Cash', source || 'admin', txnId || null, recordedBy || null, installmentId],
    );
    return r.affectedRows > 0;
  },

  async markUnpaid(installmentId) {
    const [r] = await pool.query(
      `UPDATE property_installments SET is_paid=0, paid_at=NULL, paid_amount=NULL, method=NULL,
         source=NULL, txn_id=NULL, recorded_by=NULL WHERE id = ?`, [installmentId],
    );
    return r.affectedRows > 0;
  },

  async addInstallment(propertyId, d) {
    const [[mx]] = await pool.query('SELECT COALESCE(MAX(seq),0)+1 AS next FROM property_installments WHERE property_id = ?', [propertyId]);
    const [r] = await pool.query(
      `INSERT INTO property_installments (property_id, seq, label, amount, due_date)
       VALUES (?, ?, ?, ?, ?)`,
      [propertyId, mx.next, d.label || `Installment`, d.amount || 0, iso(d.dueDate)],
    );
    return r.insertId;
  },

  async updateInstallment(installmentId, d) {
    const [r] = await pool.query(
      `UPDATE property_installments SET label = COALESCE(?, label), amount = COALESCE(?, amount),
         due_date = ?, late_fee = COALESCE(?, late_fee) WHERE id = ?`,
      [d.label ?? null, d.amount ?? null, iso(d.dueDate), d.lateFee ?? null, installmentId],
    );
    return r.affectedRows > 0;
  },

  async deleteInstallment(installmentId) {
    const [r] = await pool.query('DELETE FROM property_installments WHERE id = ?', [installmentId]);
    return r.affectedRows > 0;
  },

  // ---- context for invoices / emails ----
  async getContext(propertyId) {
    const [[ctx]] = await pool.query(
      `SELECT up.id AS propertyId, up.label, up.project_name AS projectName, up.tower,
              up.flat_no AS flatNo, up.floor, up.area_sqft AS areaSqft, up.property_type AS propertyType,
              up.address_line AS addressLine, up.city, up.state, up.pincode,
              u.id AS userId, u.name AS residentName, u.email AS residentEmail, u.mobile AS residentMobile
       FROM user_properties up JOIN users u ON u.id = up.user_id
       WHERE up.id = ? LIMIT 1`, [propertyId],
    );
    return ctx || null;
  },

  async userOwnsProperty(userId, propertyId) {
    const [[row]] = await pool.query('SELECT 1 AS ok FROM user_properties WHERE id = ? AND user_id = ? LIMIT 1', [propertyId, userId]);
    return !!row;
  },

  // Admin list: every property with a plan summary.
  async listProperties({ search } = {}) {
    const params = [];
    let where = '1=1';
    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR up.flat_no LIKE ? OR up.project_name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    const [rows] = await pool.query(
      `SELECT up.id, up.label, up.project_name AS projectName, up.tower, up.flat_no AS flatNo,
              u.id AS userId, u.name AS residentName, u.email AS residentEmail,
              pp.total_amount AS totalAmount,
              (SELECT COALESCE(SUM(CASE WHEN pi.is_paid=1 THEN COALESCE(pi.paid_amount,pi.amount) ELSE 0 END),0)
                 FROM property_installments pi WHERE pi.property_id = up.id) AS totalPaid,
              (SELECT COUNT(*) FROM property_installments pi WHERE pi.property_id = up.id) AS installmentCount,
              (SELECT COUNT(*) FROM property_installments pi WHERE pi.property_id = up.id AND pi.is_paid=0
                 AND pi.due_date < CURDATE()) AS overdueCount
       FROM user_properties up
       JOIN users u ON u.id = up.user_id
       LEFT JOIN property_payment_plans pp ON pp.property_id = up.id
       WHERE ${where}
       ORDER BY u.name ASC, up.id ASC`, params,
    );
    return rows.map(r => ({
      ...r,
      totalAmount: r.totalAmount != null ? Number(r.totalAmount) : null,
      totalPaid: Number(r.totalPaid || 0),
      outstanding: r.totalAmount != null ? round2(Number(r.totalAmount) - Number(r.totalPaid || 0)) : null,
    }));
  },

  async listMyProperties(userId) {
    const [rows] = await pool.query(
      `SELECT up.id, up.label, up.project_name AS projectName, up.flat_no AS flatNo, up.tower
       FROM user_properties up WHERE up.user_id = ? ORDER BY up.id ASC`, [userId],
    );
    return rows;
  },

  // ---- online (Cashfree) order tracking ----
  async createOrder(d) {
    const [r] = await pool.query(
      `INSERT INTO property_payment_orders
        (property_id, installment_id, user_id, order_id, cashfree_order_id, payment_session_id, payment_link, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
      [d.propertyId, d.installmentId || null, d.userId, d.orderId, d.cashfreeOrderId || null,
       d.paymentSessionId || null, d.paymentLink || null, d.amount],
    );
    return r.insertId;
  },

  async findOrder(orderId) {
    const [[row]] = await pool.query('SELECT * FROM property_payment_orders WHERE order_id = ? LIMIT 1', [orderId]);
    return row || null;
  },

  async setOrderStatus(orderId, status) {
    await pool.query(
      `UPDATE property_payment_orders SET status = ?, paid_at = ${status === 'paid' ? 'NOW()' : 'paid_at'} WHERE order_id = ?`,
      [status, orderId],
    );
  },
};

module.exports = PaymentPlanModel;
