const PDFDocument = require('pdfkit');
const PaymentPlanModel = require('../models/PaymentPlanModel');

const inr = n => 'Rs ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fdate = d => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');

async function buildStatementData(propertyId) {
  const ctx = await PaymentPlanModel.getContext(propertyId);
  if (!ctx) return null;
  const plan = await PaymentPlanModel.getPlan(propertyId);
  const summary = await PaymentPlanModel.getSummary(propertyId);
  return { ctx, plan, summary };
}

const PRIMARY = '#2E4374';
const LEFT = 40;
const RIGHT = 555;

// Stream a structured A4 statement/invoice PDF to an Express response.
async function streamStatementPdf(res, propertyId) {
  const data = await buildStatementData(propertyId);
  if (!data) { res.status(404).json({ success: false, message: 'Property not found' }); return; }
  const { ctx, plan, summary } = data;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="statement-${ctx.flatNo || ctx.propertyId}.pdf"`);
  doc.pipe(res);

  // ---- header ----
  doc.rect(0, 0, 595, 92).fill(PRIMARY);
  doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('Shri Yamuna Infra', LEFT, 26);
  doc.fontSize(10).font('Helvetica').text('Payment Statement & Invoice', LEFT, 52);
  doc.fontSize(9).text(`Generated: ${fdate(new Date().toISOString())}`, 0, 30, { align: 'right', width: RIGHT });
  doc.fontSize(9).text(`Statement #YI-${ctx.propertyId}`, 0, 44, { align: 'right', width: RIGHT });

  let y = 108;
  doc.fillColor('#111');

  // ---- resident + property ----
  doc.fontSize(11).font('Helvetica-Bold').text('Resident', LEFT, y);
  doc.font('Helvetica').fontSize(10);
  doc.text(ctx.residentName || '-', LEFT, y + 16);
  doc.text(ctx.residentEmail || '-', LEFT, y + 30);
  doc.text(ctx.residentMobile ? `+91 ${ctx.residentMobile}` : '-', LEFT, y + 44);

  doc.fontSize(11).font('Helvetica-Bold').text('Property', 320, y);
  doc.font('Helvetica').fontSize(10);
  doc.text([ctx.label, ctx.flatNo].filter(Boolean).join(' / ') || 'Property', 320, y + 16);
  doc.text([ctx.projectName, ctx.tower && `Tower ${ctx.tower}`].filter(Boolean).join(' / ') || '-', 320, y + 30);
  doc.text([ctx.addressLine, ctx.city, ctx.state, ctx.pincode].filter(Boolean).join(', ') || '-', 320, y + 44, { width: 235 });

  y += 74;

  // ---- statistics (as of today) ----
  doc.roundedRect(LEFT, y, RIGHT - LEFT, 56, 6).fill('#EEF2FF');
  const stats = [
    ['Agreement value', inr(summary.totalAgreementValue)],
    ['Paid till date', inr(summary.totalPaid)],
    ['Outstanding', inr(summary.outstanding)],
    ['Late charges', inr(summary.lateCharges)],
    ['Total payable', inr(summary.totalPayable)],
  ];
  const sw = (RIGHT - LEFT) / stats.length;
  stats.forEach((s, i) => {
    const x = LEFT + i * sw;
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(s[0].toUpperCase(), x + 8, y + 9, { width: sw - 12 });
    doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text(s[1], x + 8, y + 24, { width: sw - 12 });
  });
  y += 66;

  // ---- next due highlight ----
  if (summary.nextDue) {
    doc.roundedRect(LEFT, y, RIGHT - LEFT, 34, 6).fillAndStroke('#FFF7ED', '#FED7AA');
    doc.fillColor('#9A3412').fontSize(9).font('Helvetica-Bold').text('NEXT DUE', LEFT + 10, y + 7);
    doc.fillColor('#111').fontSize(13).font('Helvetica-Bold')
      .text(`${inr(Number(summary.nextDue.amount) + Number(summary.nextDue.lateFee || 0))}  -  ${summary.nextDue.label}`, LEFT + 10, y + 18);
    doc.fillColor('#9A3412').fontSize(10).font('Helvetica')
      .text(`due ${fdate(summary.nextDue.dueDate)} (${String(summary.nextDue.status).toUpperCase()})`, 0, y + 12, { align: 'right', width: RIGHT - 10 });
    y += 44;
  }

  // ---- plan line ----
  if (plan) {
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(
      [`Down payment: ${inr(plan.downpayment)}`,
       `${plan.installmentCount} installments of ${inr(plan.installmentAmount)} (${plan.frequency})`,
       `First due ${fdate(plan.firstDueDate)}`, `Ends ${fdate(plan.endDate)}`,
       plan.lateFeeEnabled ? `Late fee: ${plan.lateFeeType === 'percent' ? plan.lateFeeValue + '%' : inr(plan.lateFeeValue)} after ${plan.lateFeeGraceDays}d` : 'No late fee',
      ].join('   |   '), LEFT, y, { width: RIGHT - LEFT });
    y += 20;
  }

  // ---- sections ----
  y = section(doc, y, 'OVERDUE', '#B91C1C', summary.overdue, true);
  y = section(doc, y, 'DUE / UPCOMING', '#B45309', [...summary.due, ...summary.upcoming], true);
  y = section(doc, y, 'PAID', '#15803D', summary.paid, false);

  // ---- totals ----
  if (y > 760) { doc.addPage(); y = 50; }
  y += 6;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#CBD5E1').stroke();
  y += 8;
  doc.fillColor('#111').fontSize(10).font('Helvetica-Bold');
  doc.text(`Total paid: ${inr(summary.totalPaid)}`, LEFT, y);
  doc.text(`Outstanding: ${inr(summary.outstanding)}`, 200, y);
  if (summary.lateCharges > 0) doc.fillColor('#B91C1C').text(`+ Late: ${inr(summary.lateCharges)}`, 360, y);
  doc.fillColor(PRIMARY).text(`Payable: ${inr(summary.totalPayable)}`, 0, y, { align: 'right', width: RIGHT });

  doc.fontSize(8).fillColor('#94A3B8').font('Helvetica')
    .text('System-generated statement from Shri Yamuna Infra. Amounts are computed as of the generation date. For queries, contact the office.',
      LEFT, 808, { width: RIGHT - LEFT, align: 'center' });

  doc.end();
}

// Render one labelled section table; returns the new y.
function section(doc, y, title, color, rows, showStatus) {
  if (!rows || rows.length === 0) return y;
  if (y > 740) { doc.addPage(); y = 50; }
  doc.fillColor(color).fontSize(10).font('Helvetica-Bold').text(`${title} (${rows.length})`, LEFT, y);
  y += 15;

  const cols = showStatus
    ? [['#', LEFT, 22], ['Installment', LEFT + 22, 150], ['Due', LEFT + 172, 75], ['Amount', LEFT + 247, 75], ['Late', LEFT + 322, 60], ['Status', LEFT + 382, 70], ['', LEFT + 452, 103]]
    : [['#', LEFT, 22], ['Installment', LEFT + 22, 150], ['Paid on', LEFT + 172, 80], ['Amount', LEFT + 252, 80], ['Method', LEFT + 332, 90], ['Source', LEFT + 422, 80], ['Txn', LEFT + 502, 53]];

  doc.rect(LEFT, y, RIGHT - LEFT, 16).fill('#F1F5F9');
  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
  cols.forEach(c => doc.text(c[0], c[1] + 3, y + 4, { width: c[2] - 5 }));
  y += 18;

  doc.font('Helvetica').fontSize(8);
  for (const r of rows) {
    if (y > 800) { doc.addPage(); y = 50; }
    doc.fillColor('#111');
    if (showStatus) {
      doc.text(String(r.seq), cols[0][1] + 3, y, { width: cols[0][2] - 5 });
      doc.text(r.label, cols[1][1] + 3, y, { width: cols[1][2] - 5 });
      doc.text(fdate(r.dueDate), cols[2][1] + 3, y, { width: cols[2][2] - 5 });
      doc.text(inr(r.amount), cols[3][1] + 3, y, { width: cols[3][2] - 5 });
      doc.fillColor(r.lateFee > 0 ? '#B91C1C' : '#94A3B8').text(r.lateFee > 0 ? inr(r.lateFee) : '-', cols[4][1] + 3, y, { width: cols[4][2] - 5 });
      doc.fillColor(color).text(String(r.status).toUpperCase(), cols[5][1] + 3, y, { width: cols[5][2] - 5 });
    } else {
      doc.text(String(r.seq), cols[0][1] + 3, y, { width: cols[0][2] - 5 });
      doc.text(r.label, cols[1][1] + 3, y, { width: cols[1][2] - 5 });
      doc.text(fdate(r.paidAt), cols[2][1] + 3, y, { width: cols[2][2] - 5 });
      doc.text(inr(r.paidAmount ?? r.amount), cols[3][1] + 3, y, { width: cols[3][2] - 5 });
      doc.text(r.method || '-', cols[4][1] + 3, y, { width: cols[4][2] - 5 });
      doc.text(r.source || '-', cols[5][1] + 3, y, { width: cols[5][2] - 5 });
      doc.fillColor('#94A3B8').fontSize(6.5).text(r.txnId || '-', cols[6][1] + 3, y, { width: cols[6][2] - 5 });
      doc.fontSize(8);
    }
    y += 14;
    doc.moveTo(LEFT, y - 3).lineTo(RIGHT, y - 3).strokeColor('#F1F5F9').stroke();
  }
  return y + 8;
}

module.exports = { streamStatementPdf, buildStatementData };
