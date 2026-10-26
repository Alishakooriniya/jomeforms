/* چاپ سربرگ رسمی — قاب سربرگ (سه کادر جدا از هم، نشان نستعلیق و خط‌چین‌های
   تاریخ/شماره/پیوست) دقیقاً همان تصویر استخراج‌شده از PDF اصلی سازمان است
   (public/letterhead/frame.jpg) تا خروجی با سربرگ چاپی یکی باشد.
   روی تصویر سه لایه قرار می‌گیرد:
     ۱) مقادیر تاریخ/شماره/پیوست روی خط‌چین‌های کادر بالا
     ۲) HTML متن نامه داخل کادر میانی (خروجی ویرایشگر صفحه «سربرگ»)
     ۳) کادر پایین که سفید روی تصویر کشیده و دوباره با نشانی قابل‌ویرایش چاپ می‌شود

   همه موقعیت‌ها درصدِ صفحه و اندازه فونت‌ها cqw هستند، پس همان طرح روی A4 و
   A5 بدون تغییر مقیاس می‌شود — پیش‌نمایش React در
   components/letterhead/LetterheadPreview.tsx از همین ثابت‌ها استفاده می‌کند. */

import { ORG_NAME } from '../config/org';
import { displayDigits } from './format';
import { FORM_FONT_FACE, FORM_FONT_FAMILY } from './print';

export type LetterheadPaper = 'A4' | 'A5';

/** تصویر قاب سربرگ — از PDF اصلی سازمان استخراج شده (۱۲۸۷×۱۸۱۲ ≈ ۱۵۵dpi روی A4) */
export const LETTERHEAD_FRAME_URL = '/letterhead/frame.jpg';

/** فیلدهای کادر بالا — هر مقدار روی خط‌چینِ کنار برچسب خودش می‌نشیند */
export const LETTERHEAD_META_FIELDS = [
  { key: 'date', label: 'تاریخ', top: 3.5 },
  { key: 'number', label: 'شماره', top: 5.95 },
  { key: 'attachment', label: 'پیوست', top: 8.4 },
] as const;

export interface LetterheadValues {
  date?: string;
  number?: string;
  attachment?: string;
  /** متن نامه — HTML خروجی ویرایشگر متن (بولد/ایتالیک/تراز/رنگ) */
  body?: string;
}

/** هندسه لایه‌های روی تصویر — درصدِ عرض/ارتفاع صفحه (مشترک با پیش‌نمایش) */
export const LETTERHEAD_LAYOUT = {
  meta: { left: 4.6, width: 10.3, fontSize: 2.05 },
  body: { top: 14.3, bottom: 7.9, left: 4.9, right: 4.7, fontSize: 2.3, lineHeight: 1.9 },
  footer: { top: 94.0, height: 4.5, left: 2.35, right: 2.35, radius: 1.55, border: 0.16, fontSize: 1.55, lineHeight: 1.45 },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* خروجی ویرایشگر محدود به همین تگ‌هاست (execCommand + چسباندن متن ساده)، ولی
   چون مقدار ذخیره و دوباره چاپ می‌شود، قبل از تزریق به سند چاپ پاک‌سازی می‌کنیم. */
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN', 'FONT']);
const ALLOWED_CSS = new Set(['color', 'text-align', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line']);

function cleanNode(el: Element): void {
  [...el.children].forEach(cleanNode);
  if (!ALLOWED_TAGS.has(el.tagName)) {
    el.replaceWith(...el.childNodes);
    return;
  }
  for (const attr of [...el.attributes]) {
    if (attr.name === 'style') {
      const safe = (el.getAttribute('style') ?? '')
        .split(';')
        .map((rule) => rule.trim())
        .filter((rule) => rule && ALLOWED_CSS.has(rule.split(':')[0].trim().toLowerCase()))
        .join('; ');
      if (safe) el.setAttribute('style', safe);
      else el.removeAttribute('style');
    } else if (!(el.tagName === 'FONT' && attr.name === 'color') && attr.name !== 'align') {
      el.removeAttribute(attr.name);
    }
  }
}

/** پاک‌سازی HTML متن نامه برای چاپ و ثبت در گزارش */
export function sanitizeLetterHtml(html: string): string {
  if (!html?.trim()) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  [...tpl.content.children].forEach(cleanNode);
  return tpl.innerHTML.trim();
}

export interface LetterheadPrintOptions {
  /** نشانی کادر پایین — از GET /letterhead می‌آید */
  address: string;
  values: LetterheadValues;
  paper: LetterheadPaper;
  /** نسخه خالی: فقط قاب سربرگ و نشانی، بدون هیچ فیلد یا متنی */
  blank?: boolean;
}

const PAPER_SIZE: Record<LetterheadPaper, { page: string; width: string; height: string }> = {
  A4: { page: 'A4', width: '210mm', height: '297mm' },
  A5: { page: 'A5', width: '148mm', height: '210mm' },
};

export function buildLetterheadPrintHtml(options: LetterheadPrintOptions): string {
  const { address, values, paper, blank = false } = options;
  const size = PAPER_SIZE[paper];
  const L = LETTERHEAD_LAYOUT;

  const metaHtml = blank
    ? ''
    : LETTERHEAD_META_FIELDS.map((field) => {
        const value = values[field.key as keyof LetterheadValues]?.trim();
        if (!value) return '';
        // dir=ltr تا دستور اعداد (۱۴۰۴/۰۸/۰۵) در متن راست‌به‌چپ به‌هم نریزد
        return `<div class="meta-value" dir="ltr" style="top:${field.top}%">${escapeHtml(displayDigits(value))}</div>`;
      }).join('');

  const bodyHtml = !blank ? sanitizeLetterHtml(values.body ?? '') : '';
  const bodyEl = bodyHtml ? `<div class="body">${bodyHtml}</div>` : '';

  const addressHtml = escapeHtml(displayDigits(address.trim())).replace(/\n/g, '<br />');

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>سربرگ ${escapeHtml(ORG_NAME)}</title>
<style>
  ${FORM_FONT_FACE}
  @page { size: ${size.page} portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ${FORM_FONT_FAMILY}; color: #111; }
  .sheet {
    position: relative; width: ${size.width}; height: ${size.height};
    overflow: hidden; background: #fff; direction: rtl;
    container-type: size;
  }
  .frame { position: absolute; inset: 0; width: 100%; height: 100%; }
  .meta-value {
    position: absolute; left: ${L.meta.left}%; width: ${L.meta.width}%;
    text-align: right; font-size: ${L.meta.fontSize}cqw; line-height: 1.2;
    font-weight: 700; white-space: nowrap; overflow: hidden;
  }
  .body {
    position: absolute; top: ${L.body.top}%; bottom: ${L.body.bottom}%;
    left: ${L.body.left}%; right: ${L.body.right}%;
    font-size: ${L.body.fontSize}cqw; line-height: ${L.body.lineHeight};
    overflow: hidden;
  }
  .body div, .body p { margin: 0; }
  .footer {
    position: absolute; top: ${L.footer.top}%; height: ${L.footer.height}%;
    left: ${L.footer.left}%; right: ${L.footer.right}%;
    background: #fff; border: ${L.footer.border}cqw solid #171717;
    border-radius: ${L.footer.radius}cqw;
    display: flex; align-items: center; justify-content: flex-start;
    padding: 0 1.2cqw; text-align: right;
    font-size: ${L.footer.fontSize}cqw; line-height: ${L.footer.lineHeight};
    font-weight: 700; overflow: hidden;
  }
  .footer > span { display: block; width: 100%; white-space: pre-wrap; }
  @media print { .sheet { break-after: avoid; } }
</style>
</head>
<body>
  <main class="sheet">
    <img class="frame" src="${LETTERHEAD_FRAME_URL}" alt="" />
    ${metaHtml}
    ${bodyEl}
    <div class="footer"><span>${addressHtml}</span></div>
  </main>
</body>
</html>`;
}

export interface LetterheadPrintWindow {
  print: () => void;
  close: () => void;
}

export function openLetterheadPrintWindow(options: LetterheadPrintOptions): LetterheadPrintWindow | null {
  const printWindow = window.open('', '_blank', 'noopener=no,width=920,height=1000');
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(buildLetterheadPrintHtml(options));
  printWindow.document.close();

  return {
    print: async () => {
      // صبر می‌کنیم فونت B Nazanin و تصویر قاب قبل از چاپ لود شده باشند
      try {
        const img = printWindow.document.querySelector<HTMLImageElement>('img.frame');
        if (img && !img.complete) {
          await new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          });
        }
        await printWindow.document.fonts?.ready;
      } catch {
        /* noop */
      }
      printWindow.focus();
      printWindow.print();
    },
    close: () => printWindow.close(),
  };
}
