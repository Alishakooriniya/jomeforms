import type { FormTemplate } from '../types';
import { formatFieldValue, renderDocument } from './template';

import vazirmatnFontUrl from '../assets/fonts/Vazirmatn[wght].woff2?url';

export const DOCUMENT_REQUEST_PAGE = {
  width: 595.32,
  height: 841.92,
} as const;

export interface DocumentRequestBodyLine {
  text: string;
  heading: boolean;
}

export interface DocumentRequestParcelOption {
  label: string;
  x: number;
  y: number;
  width: number;
  selected: boolean;
}

const PARCEL_OPTION_POSITIONS = [
  { x: 289, y: 548, width: 126 },
  { x: 128, y: 548, width: 112 },
] as const;

export function documentRequestBodyLines(
  template: FormTemplate,
  values: Record<string, string>,
  emptyPlaceholder = '',
): DocumentRequestBodyLine[] {
  const body = renderDocument(template, { ...values, land_parcel: ' ' }, { emptyPlaceholder }).body;
  let headings = 0;

  return body.split(/\r?\n/).map((text) => {
    const heading = Boolean(text.trim()) && headings < 2;
    if (heading) headings += 1;
    return { text, heading };
  });
}

export function documentRequestParcelOptions(
  template: FormTemplate,
  values: Record<string, string>,
): DocumentRequestParcelOption[] {
  const field = template.fields.find((item) => item.key === 'land_parcel');
  return (field?.options ?? []).slice(0, PARCEL_OPTION_POSITIONS.length).map((label, index) => ({
    ...PARCEL_OPTION_POSITIONS[index],
    label,
    selected: values.land_parcel === label,
  }));
}

export function documentRequestDate(template: FormTemplate, values: Record<string, string>): string {
  const field = template.fields.find((item) => item.key === 'request_date');
  const value = values.request_date?.trim() ?? '';
  return field ? formatFieldValue(field, value) : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildDocumentRequestPrintHtml(
  template: FormTemplate,
  values: Record<string, string>,
): string {
  const body = documentRequestBodyLines(template, values, '…………………')
    .map(({ text, heading }) => {
      const className = heading ? 'form-line heading' : 'form-line';
      return `<div class="${className}">${text ? escapeHtml(text) : '&nbsp;'}</div>`;
    })
    .join('');
  const parcelOptions = documentRequestParcelOptions(template, values)
    .map(({ label, x, y, width }) => {
      const left = ((x + 11) / DOCUMENT_REQUEST_PAGE.width) * 100;
      const top = ((DOCUMENT_REQUEST_PAGE.height - y) / DOCUMENT_REQUEST_PAGE.height) * 100;
      const maxWidth = (width / DOCUMENT_REQUEST_PAGE.width) * 100;
      return `<span class="parcel-option" style="left:${left}%;top:${top}%;max-width:${maxWidth}%">${escapeHtml(label)}</span>`;
    })
    .join('');
  const parcelMarks = documentRequestParcelOptions(template, values)
    .map(({ x, y, selected }) => {
      const boxY = DOCUMENT_REQUEST_PAGE.height - y - 7;
      const check = selected
        ? `<path d="M ${x - 1} ${boxY + 4} l 2 2 l 4 -5" fill="none" stroke="#111" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />`
        : '';
      return `<rect x="${x - 3}" y="${boxY}" width="8" height="8" fill="#fff" stroke="#171717" stroke-width="0.65" />${check}`;
    })
    .join('');
  const dateField = template.fields.find((field) => field.key === 'request_date');
  const dateLabel = dateField?.label ?? 'تاریخ تقاضا';
  const date = documentRequestDate(template, values);

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(template.title)}</title>
<style>
  @font-face {
    font-family: Vazirmatn;
    src: url("${escapeHtml(vazirmatnFontUrl)}") format("woff2");
    font-style: normal;
    font-weight: 100 900;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
  body { font-family: Vazirmatn, Tahoma, Arial, sans-serif; color: #111; }
  .sheet {
    position: relative; width: 210mm; height: 297mm; overflow: hidden;
    background: #fff; direction: rtl;
  }
  .frame { position: absolute; inset: 0; width: 100%; height: 100%; }
  .request-date {
    position: absolute; left: 20.2%; top: 7.8%; width: 34%; z-index: 1;
    direction: rtl; text-align: right; white-space: nowrap;
    font-size: 3.4mm; line-height: 1.2;
  }
  .form-body {
    position: absolute; inset: 5.6% 7% 5% 7%; z-index: 1;
    white-space: pre-wrap; text-align: justify; direction: rtl;
    font-size: 3.4mm; line-height: 1.82;
  }
  .form-line { min-height: 1.82em; }
  .form-line.heading { text-align: center; font-weight: 700; }
  .parcel-option {
    position: absolute; z-index: 2; transform: translateY(-70%);
    overflow: hidden; white-space: nowrap; direction: rtl; text-align: right;
    font-size: 3.4mm; line-height: 1.2; background: #fff;
  }
  @media print { .sheet { break-after: avoid; } }
</style>
</head>
<body>
  <main class="sheet">
    <svg class="frame" viewBox="0 0 595.32 841.92" aria-hidden="true">
      <path d="M 584 0 V 841.92" fill="none" stroke="#171717" stroke-width="0.55" />
      ${parcelMarks}
    </svg>
    <div class="request-date">${escapeHtml(dateLabel)}: ${escapeHtml(date)}</div>
    ${parcelOptions}
    <div class="form-body">${body}</div>
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
): DocumentRequestPrintWindow | null {
  const printWindow = window.open('', '_blank', 'noopener=no,width=920,height=1000');
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(buildDocumentRequestPrintHtml(template, values));
  printWindow.document.close();

  return {
    print: () => {
      printWindow.focus();
      printWindow.print();
    },
    close: () => printWindow.close(),
  };
}
