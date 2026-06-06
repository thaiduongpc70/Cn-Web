const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN');
}

function findBrowserExecutable() {
  const candidates = [
    process.env.PDF_BROWSER_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'chrome',
    'msedge'
  ].filter(Boolean);

  return candidates.find((candidate) => !path.isAbsolute(candidate) || fs.existsSync(candidate));
}

function runBrowserPrint(browserPath, htmlPath, pdfPath) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(browserPath, args, { windowsHide: true });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('PDF export timed out.'));
    }, 30000);

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(pdfPath)) {
        resolve();
      } else {
        reject(new Error(stderr || `Browser print failed with code ${code}.`));
      }
    });
  });
}

function latinize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfString(value) {
  return latinize(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createBasicPdf(lines) {
  const safeLines = lines.flatMap((line) => {
    const text = latinize(line);
    const chunks = [];
    for (let i = 0; i < text.length; i += 92) {
      chunks.push(text.slice(i, i + 92));
    }
    return chunks.length ? chunks : [''];
  });
  const pages = [];
  for (let i = 0; i < safeLines.length; i += 46) {
    pages.push(safeLines.slice(i, i + 46));
  }

  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  const pageRefs = [];

  pages.forEach((pageLines) => {
    const content = [
      'BT',
      '/F1 10 Tf',
      '50 800 Td',
      '14 TL',
      ...pageLines.map((line) => `(${escapePdfString(line)}) Tj T*`),
      'ET'
    ].join('\n');
    const contentObj = objects.length;
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    const pageObj = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pageRefs.push(`${pageObj} 0 R`);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  const chunks = [Buffer.from('%PDF-1.4\n', 'binary')];
  const offsets = [0];
  objects.slice(1).forEach((object, index) => {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, 'binary'));
  });
  const xrefOffset = Buffer.concat(chunks).length;
  chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n`, 'binary'));
  offsets.slice(1).forEach((offset) => {
    chunks.push(Buffer.from(`${String(offset).padStart(10, '0')} 00000 n \n`, 'binary'));
  });
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, 'binary'));

  return Buffer.concat(chunks);
}

async function htmlToPdfBuffer(html, fallbackLines = []) {
  const browserPath = findBrowserExecutable();
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bantrasua-pdf-'));
  const htmlPath = path.join(tempDir, 'document.html');
  const pdfPath = path.join(tempDir, 'document.pdf');

  try {
    if (!browserPath) {
      return createBasicPdf(fallbackLines);
    }

    await fs.promises.writeFile(htmlPath, html, 'utf8');
    await runBrowserPrint(browserPath, htmlPath, pdfPath);
    return await fs.promises.readFile(pdfPath);
  } catch (error) {
    return createBasicPdf(fallbackLines);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

module.exports = {
  escapeHtml,
  formatDate,
  formatMoney,
  htmlToPdfBuffer,
  sendPdf
};
