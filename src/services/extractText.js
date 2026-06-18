// Extracts plain text from uploaded knowledge files (PDF / DOCX / XLSX / CSV /
// TXT) and from URLs, for the RAG ingestion pipeline (Module A15 / Task 5).
const path = require('path');

function kindFromName(name = '') {
  const ext = path.extname(name).toLowerCase().replace('.', '');
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'csv') return 'csv';
  return 'text';
}

// Extract text from a PDF, supporting both pdf-parse v2 (PDFParse class) and
// the legacy v1 callable export.
async function extractPdf(buffer) {
  const mod = require('pdf-parse');
  if (mod && typeof mod.PDFParse === 'function') {
    const parser = new mod.PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return (data.text || '').replace(/\n--\s*\d+ of \d+\s*--/g, '').trim();
    } finally {
      if (typeof parser.destroy === 'function') await parser.destroy();
    }
  }
  // v1 fallback: module itself is the parser function.
  const fn = typeof mod === 'function' ? mod : mod.default;
  const data = await fn(buffer);
  return (data.text || '').trim();
}

async function fromBuffer(buffer, filename) {
  const kind = kindFromName(filename);
  if (kind === 'pdf') {
    return { kind, text: await extractPdf(buffer) };
  }
  if (kind === 'docx') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return { kind, text: (value || '').trim() };
  }
  if (kind === 'excel' || kind === 'csv') {
    const XLSX = require('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    // Render each sheet as a Markdown-ish table so the LLM keeps row/column
    // structure when answering from spreadsheets.
    const parts = wb.SheetNames.map(name => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });
      if (!rows.length) return `# ${name}\n(empty)`;
      const lines = rows.map(r => r.map(c => String(c).replace(/\s+/g, ' ').trim()).join(' | '));
      return `# ${name}\n${lines.join('\n')}`;
    });
    return { kind, text: parts.join('\n\n').trim() };
  }
  return { kind: 'text', text: buffer.toString('utf8').trim() };
}

// Fetch a URL and reduce the HTML to readable text.
async function fromUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'YamunaInfraBot/1.0' } });
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

module.exports = { fromBuffer, fromUrl, kindFromName };
