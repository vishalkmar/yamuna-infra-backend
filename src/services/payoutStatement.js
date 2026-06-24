const PDFDocument = require('pdfkit');

const inr = n => 'Rs ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fdate = d => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');

const PRIMARY = '#2E4374';
const LEFT = 40;
const RIGHT = 555;

// Stream a payout statement / commission-payout invoice PDF (Module 4.4).
//   payout: { id, amount, tds, net, status, method, txnRef, createdAt, items[] }
//   agent:  { name, email, phone, pan, gst }
//   bank:   { accountHolder, accountNumber, ifsc, bankName } | null
function streamPayoutPdf(res, { payout, agent, bank }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payout-${payout.id}.pdf"`);
  doc.pipe(res);

  // header
  doc.rect(0, 0, 595, 92).fill(PRIMARY);
  doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('Shri Yamuna Infra', LEFT, 26);
  doc.fontSize(10).font('Helvetica').text('Commission Payout Statement', LEFT, 52);
  doc.fontSize(9).text(`Payout #YI-P${payout.id}`, 0, 30, { align: 'right', width: RIGHT });
  doc.fontSize(9).text(`Date: ${fdate(payout.createdAt)}`, 0, 44, { align: 'right', width: RIGHT });

  let y = 108;
  doc.fillColor('#111');

  // agent + bank
  doc.fontSize(11).font('Helvetica-Bold').text('Agent', LEFT, y);
  doc.font('Helvetica').fontSize(10);
  doc.text(agent?.name || '-', LEFT, y + 16);
  doc.text(agent?.email || '-', LEFT, y + 30);
  doc.text(agent?.phone ? `+91 ${agent.phone}` : '-', LEFT, y + 44);
  doc.text(`PAN: ${agent?.pan || '-'}${agent?.gst ? `  GST: ${agent.gst}` : ''}`, LEFT, y + 58);

  doc.fontSize(11).font('Helvetica-Bold').text('Bank', 320, y);
  doc.font('Helvetica').fontSize(10);
  if (bank) {
    doc.text(bank.accountHolder || '-', 320, y + 16);
    const acc = bank.accountNumber ? '••••' + String(bank.accountNumber).slice(-4) : '-';
    doc.text(`A/C ${acc}`, 320, y + 30);
    doc.text(`${bank.bankName || '-'}  ${bank.ifsc || ''}`, 320, y + 44, { width: 235 });
  } else {
    doc.text('No bank details on file', 320, y + 16);
  }

  y += 84;

  // summary box
  doc.roundedRect(LEFT, y, RIGHT - LEFT, 52, 6).fill('#EEF2FF');
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(10);
  const cols = [['Gross commission', inr(payout.amount)], ['TDS', inr(payout.tds)], ['Net payable', inr(payout.net)], ['Status', String(payout.status).toUpperCase()]];
  const cw = (RIGHT - LEFT) / cols.length;
  cols.forEach((c, i) => {
    const x = LEFT + i * cw + 10;
    doc.fillColor('#64748B').font('Helvetica').fontSize(8).text(c[0], x, y + 12);
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(12).text(c[1], x, y + 26);
  });
  if (payout.txnRef) { doc.fillColor('#64748B').font('Helvetica').fontSize(8).text(`Txn: ${payout.txnRef} (${payout.method || '-'})`, LEFT, y + 58); }

  y += 78;

  // items table
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(11).text('Commission entries', LEFT, y);
  y += 20;
  doc.fontSize(9).fillColor('#64748B');
  doc.text('Booking', LEFT, y); doc.text('Deal value', 300, y); doc.text('Commission', 0, y, { align: 'right', width: RIGHT });
  y += 14;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#E2E8F0').stroke();
  y += 6;
  doc.font('Helvetica').fontSize(10).fillColor('#111');
  (payout.items || []).forEach(it => {
    doc.text(it.buyerName || it.ruleSnapshot || `#${it.id}`, LEFT, y, { width: 250 });
    doc.text(it.dealValue ? inr(it.dealValue) : '-', 300, y);
    doc.text(inr(it.amount), 0, y, { align: 'right', width: RIGHT });
    y += 18;
    if (y > 770) { doc.addPage(); y = 50; }
  });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#94A3B8').text('This is a system-generated statement. TDS is deducted as per applicable rates (section 194H).', LEFT, 800, { width: RIGHT });

  doc.end();
}

module.exports = { streamPayoutPdf };
