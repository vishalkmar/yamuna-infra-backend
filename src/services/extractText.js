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

async function fromBuffer(buffer, filename) {
  const kind = kindFromName(filename);
  if (kind === 'pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return { kind, text: data.text || '' };
  }
  if (kind === 'docx') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return { kind, text: value || '' };
  }
  if (kind === 'excel' || kind === 'csv') {
    const XLSX = require('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parts = wb.SheetNames.map(n => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`);
    return { kind, text: parts.join('\n\n') };
  }
  return { kind: 'text', text: buffer.toString('utf8') };
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
