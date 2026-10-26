/* پیش‌نمایش فرم کانواسی — همان چیدمان چاپ (lib/canvasFormPrint.ts): تصویر قاب
   فرم کاغذی + لایه مقادیر روی جای خط‌خورده + تیک گزینه‌های انتخابی. */

import type { FormTemplate } from '../../types';
import type { RenderContext } from '../../lib/template';
import {
  CANVAS_CHECK_SIZE,
  canvasCheckSvg,
  canvasFont,
  canvasOptionMarked,
  canvasPlacementText,
} from '../../lib/canvasFormPrint';
import { EmptyState } from '../ui/EmptyState';

interface CanvasFormPreviewProps {
  template: FormTemplate;
  values: Record<string, string>;
  context?: RenderContext;
}

export function CanvasFormPreview({ template, values, context }: CanvasFormPreviewProps) {
  const canvas = template.canvas;
  const baseFont = canvasFont(canvas);

  return (
    <div
      className="form-font relative mx-auto aspect-[210/297] w-full max-w-[210mm] overflow-hidden bg-white text-[#111] shadow-soft [container-type:size]"
      dir="rtl"
    >
      {canvas?.frame ? (
        <img
          src={canvas.frame}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />
      ) : null}
      {!canvas ? (
        <EmptyState icon="file" title="چیدمان این فرم تعریف نشده است" />
      ) : null}
      {canvas?.placements.map((placement, index) => {
        if (placement.option) {
          if (!canvasOptionMarked(placement, values)) return null;
          return (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                width: `${CANVAS_CHECK_SIZE}cqw`,
                height: `${CANVAS_CHECK_SIZE}cqw`,
              }}
              dangerouslySetInnerHTML={{ __html: canvasCheckSvg() }}
            />
          );
        }
        const text = canvasPlacementText(template, placement, values, context);
        if (!text) return null;
        return (
          <div
            key={index}
            className="absolute -translate-y-[52%] overflow-hidden whitespace-nowrap bg-white px-[0.4cqw] leading-[1.35]"
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: placement.width !== undefined ? `${placement.width}%` : undefined,
              textAlign: placement.align ?? 'right',
              fontSize: `${baseFont * (placement.fontScale ?? 1)}cqw`,
            }}
            dir="rtl"
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}
