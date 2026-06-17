const { pool } = require('../config/db');

const PaymentModel = {
  // -----------------------------------------------------------------------
  // Installments / schedule
  // -----------------------------------------------------------------------

  async getSchedule(bookingCode) {
    const [rows] = await pool.query(
      `SELECT i.id, i.label, i.amount, i.late_fee AS lateFee,
              i.due_date AS dueDate, i.original_due_date AS originalDueDate, i.status
       FROM installments i
       JOIN bookings b ON b.id = i.booking_id
       WHERE b.booking_code = ?
       ORDER BY i.due_date ASC, i.id ASC`,
      [bookingCode],
    );
    return rows;
  },

  async getNextDue(bookingCode) {
    const [rows] = await pool.query(
      `SELECT i.id, i.label, i.amount, i.late_fee AS lateFee, i.due_date AS dueDate, i.status
       FROM installments i
       JOIN bookings b ON b.id = i.booking_id
       WHERE b.booking_code = ? AND i.status IN ('due','upcoming','overdue')
       ORDER BY (i.status = 'overdue') DESC, (i.status = 'due') DESC, i.due_date ASC
       LIMIT 1`,
      [bookingCode],
    );
    return rows[0] || null;
  },

  async getInstallmentById(bookingCode, installmentId) {
    const [rows] = await pool.query(
      `SELECT i.id, i.booking_id AS bookingId, i.label, i.amount, i.late_fee AS lateFee,
              i.due_date AS dueDate, i.status
       FROM installments i
       JOIN bookings b ON b.id = i.booking_id
       WHERE b.booking_code = ? AND i.id = ? LIMIT 1`,
      [bookingCode, installmentId],
    );
    return rows[0] || null;
  },

  async getOutstanding(bookingCode) {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(i.amount + i.late_fee), 0) AS outstanding,
              COUNT(*) AS pendingCount
       FROM installments i
       JOIN bookings b ON b.id = i.booking_id
       WHERE b.booking_code = ? AND i.status IN ('due','upcoming','overdue')`,
      [bookingCode],
    );
    return rows[0] || { outstanding: 0, pendingCount: 0 };
  },

  // -----------------------------------------------------------------------
  // Overdue / late fees
  // -----------------------------------------------------------------------

  async markOverdueForBooking(bookingCode) {
    const [r] = await pool.query(
      `UPDATE installments i
       JOIN bookings b ON b.id = i.booking_id
       SET i.status = 'overdue'
       WHERE b.booking_code = ? AND i.status = 'due' AND i.due_date < CURDATE()`,
      [bookingCode],
    );
    return r.affectedRows;
  },

  async applyLateFee({ installmentId, amount, reason }) {
    const [inst] = await pool.query(
      'SELECT booking_id FROM installments WHERE id = ?',
      [installmentId],
    );
    if (inst.length === 0) return null;
    await pool.query(
      'UPDATE installments SET late_fee = late_fee + ? WHERE id = ?',
      [amount, installmentId],
    );
    await pool.query(
      'INSERT INTO late_fee_events (installment_id, booking_id, amount, reason) VALUES (?, ?, ?, ?)',
      [installmentId, inst[0].booking_id, amount, reason || null],
    );
    return true;
  },

  // -----------------------------------------------------------------------
  // Payment history
  // -----------------------------------------------------------------------

  async getHistory(bookingCode, { search, method, limit = 50 } = {}) {
    const params = [bookingCode];
    let where = 'b.booking_code = ?';
    if (search) {
      where += ' AND (p.txn_id LIKE ? OR p.remarks LIKE ? OR p.cashfree_order_id LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (method) {
      where += ' AND p.method = ?';
      params.push(method);
    }
    params.push(Number(limit) || 50);
    const [rows] = await pool.query(
      `SELECT p.id, p.txn_id AS txnId, p.cashfree_order_id AS cashfreeOrderId,
              p.amount, p.paid_at AS date, p.method, p.status, p.remarks,
              i.label AS installmentLabel
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN installments i ON i.id = p.installment_id
       WHERE ${where}
       ORDER BY p.paid_at DESC, p.id DESC
       LIMIT ?`,
      params,
    );
    return rows;
  },

  // -----------------------------------------------------------------------
  // Ledger (full statement)
  // -----------------------------------------------------------------------

  async getLedger(bookingCode) {
    const [agreement] = await pool.query(
      'SELECT agreement_value FROM bookings WHERE booking_code = ?',
      [bookingCode],
    );
    const totalAgreementValue = Number(agreement[0]?.agreement_value || 0);

    const [paidRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       WHERE b.booking_code = ? AND p.status = 'success'`,
      [bookingCode],
    );
    const totalPaid = Number(paidRows[0].paid);

    const [installments] = await pool.query(
      `SELECT i.id, i.label, i.amount, i.late_fee AS lateFee, i.due_date AS dueDate, i.status
       FROM installments i JOIN bookings b ON b.id = i.booking_id
       WHERE b.booking_code = ?
       ORDER BY i.due_date ASC`,
      [bookingCode],
    );

    const [payments] = await pool.query(
      `SELECT p.id, p.txn_id AS txnId, p.amount, p.paid_at AS paidAt, p.method,
              i.label AS installmentLabel
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN installments i ON i.id = p.installment_id
       WHERE b.booking_code = ? AND p.status = 'success'
       ORDER BY p.paid_at ASC`,
      [bookingCode],
    );

    return {
      summary: {
        totalAgreementValue,
        totalPaid,
        outstanding: Math.max(0, totalAgreementValue - totalPaid),
        progressPct: totalAgreementValue > 0
          ? Math.round((totalPaid / totalAgreementValue) * 100)
          : 0,
      },
      installments,
      payments,
    };
  },

  // -----------------------------------------------------------------------
  // Orders + payment recording
  // -----------------------------------------------------------------------

  async createOrder({
    bookingCode, userId, installmentId, orderId, amount, currency = 'INR',
    mode, remarks, environment,
    cashfreeOrderId, paymentSessionId, paymentLink, rawResponse,
  }) {
    const [r] = await pool.query(
      `INSERT INTO payment_orders
        (booking_code, user_id, installment_id, order_id,
         cashfree_order_id, payment_session_id, payment_link,
         amount, currency, mode, remarks, status, environment, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)`,
      [
        bookingCode, userId, installmentId || null, orderId,
        cashfreeOrderId || null, paymentSessionId || null, paymentLink || null,
        amount, currency, mode, remarks || null, environment || 'sandbox',
        rawResponse ? JSON.stringify(rawResponse) : null,
      ],
    );
    return r.insertId;
  },

  async findOrderByOrderId(orderId) {
    const [rows] = await pool.query(
      `SELECT po.*, b.id AS booking_pk
       FROM payment_orders po
       JOIN bookings b ON b.booking_code = po.booking_code
       WHERE po.order_id = ? LIMIT 1`,
      [orderId],
    );
    return rows[0] || null;
  },

  async findOrderByCashfreeId(cashfreeOrderId) {
    const [rows] = await pool.query(
      `SELECT po.*, b.id AS booking_pk
       FROM payment_orders po
       JOIN bookings b ON b.booking_code = po.booking_code
       WHERE po.cashfree_order_id = ? LIMIT 1`,
      [cashfreeOrderId],
    );
    return rows[0] || null;
  },

  async updateOrderStatus({ orderId, status, gatewayTxnId, failureReason, rawResponse }) {
    await pool.query(
      `UPDATE payment_orders
       SET status = ?,
           gateway_txn_id = COALESCE(?, gateway_txn_id),
           failure_reason = COALESCE(?, failure_reason),
           raw_response  = COALESCE(?, raw_response),
           paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
       WHERE order_id = ?`,
      [
        status,
        gatewayTxnId || null,
        failureReason || null,
        rawResponse ? JSON.stringify(rawResponse) : null,
        status,
        orderId,
      ],
    );
  },

  async recordPayment({
    bookingPk, installmentId, txnId, cashfreeOrderId, amount, method, remarks,
  }) {
    const [r] = await pool.query(
      `INSERT INTO payments
        (booking_id, installment_id, txn_id, cashfree_order_id,
         amount, method, status, paid_at, remarks)
       VALUES (?, ?, ?, ?, ?, ?, 'success', NOW(), ?)`,
      [bookingPk, installmentId || null, txnId, cashfreeOrderId || null,
       amount, method, remarks || null],
    );

    // If the payment fully covers the installment, mark it paid.
    if (installmentId) {
      const [sumRows] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid_sum,
                (SELECT amount + late_fee FROM installments WHERE id = ?) AS total_due
         FROM payments WHERE installment_id = ? AND status = 'success'`,
        [installmentId, installmentId],
      );
      const paidSum = Number(sumRows[0].paid_sum);
      const totalDue = Number(sumRows[0].total_due);
      if (totalDue > 0 && paidSum >= totalDue) {
        await pool.query(`UPDATE installments SET status = 'paid' WHERE id = ?`, [installmentId]);
      }
    }
    return r.insertId;
  },

  async generateReceipt({ paymentId, email, whatsapp }) {
    const code = 'RCPT-' + Date.now();
    await pool.query(
      `INSERT INTO payment_receipts (payment_id, receipt_code, sent_to_email, sent_to_whatsapp)
       VALUES (?, ?, ?, ?)`,
      [paymentId, code, email || null, whatsapp || null],
    );
    return code;
  },

  // -----------------------------------------------------------------------
  // Webhook events (audit)
  // -----------------------------------------------------------------------

  async logWebhookEvent({ eventType, cashfreeOrderId, signatureValid, payload, processError }) {
    await pool.query(
      `INSERT INTO payment_webhook_events
        (event_type, cashfree_order_id, signature_valid, payload, processed_at, process_error)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        eventType, cashfreeOrderId || null, signatureValid ? 1 : 0,
        JSON.stringify(payload),
        processError ? null : new Date(),
        processError || null,
      ],
    );
  },
};

module.exports = PaymentModel;
