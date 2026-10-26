/* چاپ فرم‌های کانواسی — قاب فرم کاغذی (تصویر استخراج‌شده از PDF رسمی) پشت
   صفحه می‌نشیند و مقدار هر فیلد دقیقاً روی جای خط‌خورده‌اش لایه می‌شود؛
   مثل سربرگ. همه موقعیت‌ها درصدِ صفحه و اندازه فونت‌ها cqw هستند، پس
   پیش‌نمایش React (components/documents/CanvasFormPreview.tsx) و خروجی چاپ
   یکسان‌اند و روی هر ابعادی مقیاس می‌شوند. */

import type { CanvasPlacement, FormTemplate, TemplateCanvas } from '../types';
import { FORM_FONT_FACE, FORM_FONT_FAMILY } from './print';
import { renderTemplate } from './template';
import type { RenderContext } from './template';
import { ORG_NAME } from '../config/org';

export const CANVAS_BASE_FONT = 2.05;

export function canvasFont(canvas?: TemplateCanvas): number {
  return canvas?.fontSize ?? CANVAS_BASE_FONT;
}

/** متن قابل‌چاپ یک نقطه — برای نشانه‌های select همیشه خالی است */
export function canvasPlacementText(
  template: FormTemplate,
  placement: CanvasPlacement,
  values: Record<string, string>,
  context: RenderContext = {},
): string {
  if (placement.option) return '';
  const text = renderTemplate(`{{${placement.field}}}`, template.fields, values, context);
  return text.trim();
}

export function canvasOptionMarked(
  placement: CanvasPlacement,
  values: Record<string, string>,
): boolean {
  return Boolean(placement.option) && values[placement.field] === placement.option;
}

/** تیک روی مربعِ پخته‌شده در قاب — مرکزش روی مرکز مربع می‌نشیند */
export const CANVAS_CHECK_SIZE = 2.4;

export function canvasCheckSvg(): string {
  return `<svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true"><path d="M 1.6 5.6 L 4.1 8 L 8.6 2.3" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface CanvasPrintOptions {
  context?: RenderContext;
}

export function buildCanvasFormPrintHtml(
  template: FormTemplate,
  values: Record<string, string>,
  options: CanvasPrintOptions = {},
): string {
  const canvas = template.canvas;
  const baseFont = canvasFont(canvas);
  const context = options.context ?? {};

  const layers = (canvas?.placements ?? [])
    .map((placement) => {
      const size = baseFont * (placement.fontScale ?? 1);
      if (placement.option) {
        if (!canvasOptionMarked(placement, values)) return '';
        return `<div class="check" style="left:${placement.x}%;top:${placement.y}%">${canvasCheckSvg()}</div>`;
      }
      const text = canvasPlacementText(template, placement, values, context);
      if (!text) return '';
      const width = placement.width !== undefined ? `width:${placement.width}%;` : '';
      const align = placement.align ?? 'right';
      return `<div class="value" style="left:${placement.x}%;top:${placement.y}%;${width}text-align:${align};font-size:${size}cqw">${escapeHtml(text)}</div>`;
    })
    .join('');

  const frame = canvas?.frame ? `<img class="frame" src="${escapeHtml(canvas.frame)}" alt="" />` : '';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(template.title)} — ${escapeHtml(ORG_NAME)}</title>
<style>
  ${FORM_FONT_FACE}
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ${FORM_FONT_FAMILY}; color: #111; }
  .sheet {
    position: relative; width: 210mm; height: 297mm; overflow: hidden;
    background: #fff; direction: rtl; container-type: size;
  }
  .frame { position: absolute; inset: 0; width: 100%; height: 100%; }
  .value {
    position: absolute; transform: translateY(-52%);
    background: #fff; padding: 0 0.4cqw; line-height: 1.35;
    white-space: nowrap; overflow: hidden;
  }
  .check {
    position: absolute; transform: translate(-50%, -50%);
    width: ${CANVAS_CHECK_SIZE}cqw; height: ${CANVAS_CHECK_SIZE}cqw;
  }
  @media print { .sheet { break-after: avoid; } }
</style>
</head>
<body>
  <main class="sheet">
    ${frame}
    ${layers}
  </main>
</body>
</html>`;
}

export interface CanvasFormPrintWindow {
  print: () => void;
  close: () => void;
}

export function openCanvasFormPrintWindow(
  template: FormTemplate,
  values: Record<string, string>,
  options: CanvasPrintOptions = {},
): CanvasFormPrintWindow | null {
  const printWindow = window.open('', '_blank', 'noopener=no,width=920,height=1000');
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(buildCanvasFormPrintHtml(template, values, options));
  printWindow.document.close();

  return {
    print: () => {
      printWindow.focus();
      printWindow.print();
    },
    close: () => printWindow.close(),
  };
}
