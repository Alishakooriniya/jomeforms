import type { FormTemplate, TemplateField } from '../types';
import { displayDigits, formatDate } from './format';
import { formatFieldValue, TOKEN_PATTERN } from './template';
import { FORM_FONT_FACE, FORM_FONT_FAMILY } from './print';

export const DOCUMENT_REQUEST_PAGE = {
  width: 595.32,
  height: 841.92,
} as const;

export interface DocumentRequestRenderOptions {
  emptyPlaceholder?: string;
  isTemplatePreview?: boolean;
}

const CHECK_SVG = `<svg viewBox="0 0 10 10" class="check-svg" aria-hidden="true"><path d="M 1.8 5.4 L 4.2 8 L 8.4 2.4" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatInlineValue(
  field: TemplateField | undefined,
  val: string | undefined,
  options: DocumentRequestRenderOptions = {},
): string {
  const trimmed = val?.trim() ?? '';
  if (trimmed) {
    const formatted = field ? formatFieldValue(field, trimmed) : trimmed;
    return `<span class="val-filled">${escapeHtml(displayDigits(formatted))}</span>`;
  }
  if (options.isTemplatePreview && field?.label) {
    return `<span class="val-sample">«${escapeHtml(field.label)}»</span>`;
  }
  const dots = options.emptyPlaceholder ?? '................................';
  return `<span class="val-empty">${escapeHtml(dots)}</span>`;
}

/** تبدیل متن قالب فرم به HTML جاری با چک‌باکس‌ها و داده‌های جایگزین‌شده */
export function renderDocumentRequestBodyHtml(
  template: FormTemplate,
  values: Record<string, string>,
  options: DocumentRequestRenderOptions = {},
): string {
  const fieldMap = new Map(template.fields.map((field) => [field.key, field]));

  // خطوط متن را جدا می‌کنیم تا عنوان‌های پیش‌فرض و پاراگراف اصلی تمیز شوند
  const rawBody = template.body.trim();

  // نشانه‌ها را با HTML جاری جایگزین می‌کنیم
  const replaced = rawBody.replace(TOKEN_PATTERN, (_match, rawKey: string) => {
    const raw = rawKey.trim();

    // نشانه گزینه مثل {{land_parcel:اراضی مزرعه هاشم آباد پلاک ثبتی یک اصلی}}
    if (raw.includes(':')) {
      const colonIdx = raw.indexOf(':');
      const key = raw.slice(0, colonIdx).trim();
      const option = raw.slice(colonIdx + 1).trim();
      const isSelected = (values[key]?.trim() ?? '') === option;
      return `<span class="inline-checkbox${isSelected ? ' is-checked' : ''}">${isSelected ? CHECK_SVG : ''}</span>`;
    }

    const field = fieldMap.get(raw);
    return formatInlineValue(field, values[raw], options);
  });

  // پاراگراف‌ها را با تگ p یا div می‌سازیم
  return replaced
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="form-p">${p.replace(/\r?\n/g, '<br />')}</p>`)
    .join('');
}

export function documentRequestDate(
  template: FormTemplate,
  values: Record<string, string>,
  options: DocumentRequestRenderOptions = {},
): string {
  const field = template.fields.find((item) => item.key === 'request_date' || item.type === 'date');
  const val = field ? values[field.key]?.trim() : values.request_date?.trim();
  if (val) {
    return `<bdi dir="ltr">${escapeHtml(displayDigits(formatDate(val, 'short')))}</bdi>`;
  }
  if (options.isTemplatePreview) return '«تاریخ»';
  return options.emptyPlaceholder ?? '…………………';
}

export function documentRequestFullName(
  template: FormTemplate,
  values: Record<string, string>,
  options: DocumentRequestRenderOptions = {},
): string {
  const field = template.fields.find((item) => item.key === 'full_name' || item.source === 'fullName');
  const val = field ? values[field.key]?.trim() : values.full_name?.trim();
  if (val) return escapeHtml(displayDigits(val));
  if (options.isTemplatePreview) return '«نام متقاضی»';
  return options.emptyPlaceholder ?? '................................';
}

export function documentRequestNationalId(
  template: FormTemplate,
  values: Record<string, string>,
  options: DocumentRequestRenderOptions = {},
): string {
  const field = template.fields.find((item) => item.key === 'national_id' || item.type === 'nationalId');
  const val = field ? values[field.key]?.trim() : values.national_id?.trim();
  if (val) return escapeHtml(displayDigits(val));
  if (options.isTemplatePreview) return '«کد ملی»';
  return options.emptyPlaceholder ?? '................';
}

export function buildDocumentRequestPrintHtml(
  template: FormTemplate,
  values: Record<string, string>,
  options: DocumentRequestRenderOptions = {},
): string {
  const bodyHtml = renderDocumentRequestBodyHtml(template, values, options);
  const dateStr = documentRequestDate(template, values, options);
  const fullNameStr = documentRequestFullName(template, values, options);
  const nationalIdStr = documentRequestNationalId(template, values, options);

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(template.title)}</title>
<style>
  ${FORM_FONT_FACE}
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; }
  body {
    font-family: ${FORM_FONT_FAMILY};
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: #fff;
    direction: rtl;
    padding: 12mm 13.5mm;
  }
  .frame-border {
    position: absolute;
    top: 8.5mm;
    left: 8.5mm;
    right: 8.5mm;
    bottom: 8.5mm;
    border: 1.5px double #171717;
    pointer-events: none;
  }
  .top-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .top-left-block {
    position: absolute;
    top: 13mm;
    left: 14mm;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    direction: ltr;
  }
  .fn-code {
    font-family: Arial, sans-serif;
    font-size: 12pt;
    color: #111;
    line-height: 1.2;
  }
  .date-row {
    margin-top: 5mm;
    font-size: 13.5pt;
    line-height: 1.2;
    direction: rtl;
    text-align: right;
  }
  .header-block {
    text-align: center;
    margin-top: 12mm;
  }
  .bismillah {
    font-family: Arial, sans-serif;
    font-size: 13pt;
    color: #111;
    margin-bottom: 4mm;
  }
  .form-title {
    font-size: 16pt;
    font-weight: 700;
    color: #111;
    margin: 0;
  }
  .recipient-block {
    margin-top: 9mm;
    text-align: right;
    font-size: 13.5pt;
    font-weight: 700;
    line-height: 1.7;
  }
  .recipient-title { margin: 0; }
  .recipient-salutation { margin: 1.5mm 0 0 0; }
  .form-content {
    margin-top: 5mm;
    font-size: 13.5pt;
    line-height: 2.15;
    text-align: justify;
    text-justify: inter-word;
    color: #111;
  }
  .form-p {
    margin: 0 0 4mm 0;
    text-indent: 0;
  }
  .val-filled {
    font-weight: 700;
    color: #111;
    padding: 0 1.5pt;
  }
  .val-empty {
    color: #777;
    letter-spacing: 0.05em;
    font-family: Arial, sans-serif;
    font-size: 11pt;
  }
  .val-sample {
    color: #1f674c;
    font-weight: 700;
    padding: 0 2pt;
  }
  .inline-checkbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 10.5pt;
    height: 10.5pt;
    border: 1pt solid #171717;
    background: #fff;
    vertical-align: -1.5pt;
    margin: 0 3.5pt;
  }
  .check-svg {
    width: 100%;
    height: 100%;
  }
  .signatures-area {
    margin-top: 14mm;
    display: flex;
    justify-content: flex-end;
  }
  .applicant-sig {
    width: 60mm;
    font-size: 13.5pt;
    font-weight: 700;
    line-height: 1.85;
    text-align: right;
  }
  .sig-space {
    height: 18mm;
  }
  .custodian-area {
    margin-top: 20mm;
    text-align: right;
    font-size: 13.5pt;
    font-weight: 700;
  }
  @media print {
    .sheet { break-after: avoid; }
  }
</style>
</head>
<body>
  <main class="sheet">
    <div class="frame-border"></div>
    <div class="top-meta">
      <div class="top-left-block">
        <span class="fn-code">FN04</span>
        <div class="date-row">تاریخ : ${dateStr}</div>
      </div>
    </div>
    <div class="header-block">
      <div class="bismillah">بسمه تعالی</div>
      <h1 class="form-title">${escapeHtml(template.title)}</h1>
    </div>
    <div class="recipient-block">
      <p class="recipient-title">تولیت محترم محبوسات عام المنفعه امام جمعه</p>
      <p class="recipient-salutation">سلام علیکم</p>
    </div>
    <div class="form-content">
      ${bodyHtml}
    </div>
    <div class="signatures-area">
      <div class="applicant-sig">
        <div>نام و نام خانوادگی : ${fullNameStr}</div>
        <div>کد ملی : ${nationalIdStr}</div>
        <div style="margin-top: 2mm;">امضاء</div>
        <div class="sig-space"></div>
      </div>
    </div>
    <div class="custodian-area">
      <div>نظریه تولیت:</div>
    </div>
  </main>
</body>
</html>`;
}

export interface DocumentRequestPrintWindow {
  print: () => void;
  close: () => void;
}

export function openDocumentRequestPrintWindow(
  template: FormTemplate,
  values: Record<string, string>,
  options: DocumentRequestRenderOptions = {},
): DocumentRequestPrintWindow | null {
  const printWindow = window.open('', '_blank', 'noopener=no,width=920,height=1000');
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(buildDocumentRequestPrintHtml(template, values, options));
  printWindow.document.close();

  return {
    print: async () => {
      try {
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
