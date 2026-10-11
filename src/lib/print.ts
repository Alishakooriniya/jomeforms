/* چاپ و خروجی‌گیری.
   چاپ با پنجره‌ی مستقل انجام می‌شود تا استایل A4 و RTL کاملاً کنترل شود
   (خروجی PDF از همان مسیر «چاپ → ذخیره به‌عنوان PDF» مرورگر گرفته می‌شود). */

import { downloadFile } from './utils';

export interface SignatureBlock {
  label: string;
  name?: string;
}

export interface DocumentPrintOptions {
  title: string;
  docNumber?: string;
  dateText?: string;
  clientName?: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  org: { name: string; phone?: string; address?: string };
  signatures?: SignatureBlock[];
  /** نقطه‌چین برای فیلدهای خالی در نسخه چاپی */
  blankLine?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_STYLES = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Vazirmatn, IRANSansX, 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl; text-align: right; color: #171717; margin: 0;
    font-size: 11.5pt; line-height: 1.9;
  }
  .sheet { max-width: 186mm; margin: 0 auto; }
  .org { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
         border-bottom: 2px solid #24815d; padding-bottom: 6px; margin-bottom: 14px; }
  .org h1 { font-size: 15pt; margin: 0 0 4px; color: #1f674c; }
  .org .meta { font-size: 8.6pt; color: #565656; line-height: 1.6; }
  .doc-head { display: flex; justify-content: space-between; font-size: 9.5pt; color: #565656; margin-bottom: 10px; }
  h2.title { text-align: center; font-size: 14pt; margin: 6px 0 14px; }
  .note { border: 1px solid #d1d1d1; border-radius: 6px; padding: 8px 10px; font-size: 10pt;
          background: #f5f5f5; margin-bottom: 12px; }
  .body { white-space: pre-wrap; text-align: justify; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px dashed #d1d1d1; font-size: 9.5pt; color: #565656; }
  .signs { display: flex; gap: 16px; margin-top: 34px; }
  .sign { flex: 1; border: 1px solid #d1d1d1; border-radius: 6px; min-height: 28mm; padding: 8px; }
  .sign b { display: block; font-size: 10pt; margin-bottom: 26px; }
  .sign span { font-size: 9pt; color: #565656; }
  @media print { .sheet { max-width: none; } }
`;

/** HTML کامل برگه سند (هم برای چاپ هم برای دانلود) */
export function buildDocumentHtml(options: DocumentPrintOptions): string {
  const { org } = options;
  const header = options.headerText
    ? `<div class="note">${escapeHtml(options.headerText)}</div>`
    : '';
  const footer = options.footerText ? `<div class="footer">${escapeHtml(options.footerText)}</div>` : '';
  const signatures = options.signatures?.length
    ? `<div class="signs">${options.signatures
        .map(
          (sign) =>
            `<div class="sign"><b>${escapeHtml(sign.label)}</b><span>${escapeHtml(sign.name ?? 'نام و امضا')}</span></div>`,
        )
        .join('')}</div>`
    : '';
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(options.title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<div class="sheet">
  <div class="org">
    <div>
      <h1>${escapeHtml(org.name)}</h1>
      <div class="meta">${escapeHtml(org.address ?? '')}</div>
    </div>
    <div class="meta">
      ${org.phone ? `<div>تلفن: ${escapeHtml(org.phone)}</div>` : ''}
      ${options.dateText ? `<div>تاریخ: ${escapeHtml(options.dateText)}</div>` : ''}
    </div>
  </div>
  <div class="doc-head">
    <span>${options.clientName ? `پرونده: ${escapeHtml(options.clientName)}` : ''}</span>
    <span>${options.docNumber ? `شماره سند: ${escapeHtml(options.docNumber)}` : ''}</span>
  </div>
  <h2 class="title">${escapeHtml(options.title)}</h2>
  ${header}
  <div class="body">${escapeHtml(options.bodyText)}</div>
  ${footer}
  ${signatures}
</div>
</body>
</html>`;
}

/** باز کردن پنجره چاپ. اگر مرورگر پاپ‌آپ را ببندد، false برمی‌گرداند. */
export function printDocumentHtml(html: string): boolean {
  const win = window.open('', '_blank', 'noopener=no,width=920,height=1000');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  const trigger = () => {
    win.focus();
    win.print();
  };
  if (win.document.readyState === 'complete') setTimeout(trigger, 250);
  else win.onload = () => setTimeout(trigger, 250);
  return true;
}

export function downloadDocumentHtml(filename: string, html: string) {
  downloadFile(filename, html, 'text/html;charset=utf-8');
}

export function downloadTextFile(filename: string, text: string) {
  downloadFile(filename, text, 'text/plain;charset=utf-8');
}

/** خروجی CSV سازگار با اکسل فارسی (BOM + جداکننده کاما) */
export function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escapeCell = (cell: string | number) => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
  downloadFile(filename, content, 'text/csv;charset=utf-8');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
