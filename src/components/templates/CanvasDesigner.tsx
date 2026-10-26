/* طراح کانواس فرم — مدیر جای هر فیلد را روی قاب تصویری فرم می‌گذارد و
   جابه‌جا می‌کند؛ همان چیدمانی که در پیش‌نمایش و چاپ استفاده می‌شود. */

import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { CanvasPlacement, TemplateCanvas, TemplateField } from '../../types';
import { CANVAS_CHECK_SIZE, canvasFont } from '../../lib/canvasFormPrint';
import { displayDigits } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Select } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { NumberInput } from '../ui/Controls';

interface CanvasDesignerProps {
  canvas: TemplateCanvas;
  fields: TemplateField[];
  readOnly?: boolean;
  onChange: (canvas: TemplateCanvas) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pct = (value: number) => Math.round(value * 100) / 100;

const ALIGN_OPTIONS = [
  { value: 'right', label: 'راست' },
  { value: 'center', label: 'وسط' },
  { value: 'left', label: 'چپ' },
];

const SCALE_OPTIONS = [0.7, 0.85, 1, 1.15, 1.3, 1.5].map((scale) => ({
  value: String(scale),
  label: `${displayDigits(Math.round(scale * 100))}٪`,
}));

export function CanvasDesigner({ canvas, fields, readOnly = false, onChange }: CanvasDesignerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<{ field: string; option?: string } | null>(null);

  const placements = canvas.placements;
  const baseFont = canvasFont(canvas);
  const labelOf = (key: string) => fields.find((field) => field.key === key)?.label ?? key;

  const commit = (next: CanvasPlacement[]) => onChange({ ...canvas, placements: next });
  const patch = (index: number, partial: Partial<CanvasPlacement>) =>
    commit(placements.map((item, i) => (i === index ? { ...item, ...partial } : item)));

  const pointOf = (clientX: number, clientY: number) => {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return { x: 50, y: 50 };
    return {
      x: pct(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)),
      y: pct(clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)),
    };
  };

  const placeAt = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!pending || readOnly) return;
    const point = pointOf(event.clientX, event.clientY);
    const next: CanvasPlacement = {
      field: pending.field,
      ...(pending.option ? { option: pending.option } : {}),
      x: point.x,
      y: point.y,
      ...(pending.option ? {} : { width: 15 }),
    };
    commit([...placements, next]);
    setSelected(placements.length);
    setPending(null);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, index: number) => {
    if (readOnly) return;
    event.stopPropagation();
    event.preventDefault();
    setSelected(index);
    dragRef.current = index;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const index = dragRef.current;
    if (index === null || readOnly) return;
    patch(index, pointOf(event.clientX, event.clientY));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const selectedPlacement = selected !== null ? placements[selected] : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader
            title="جای فیلدها روی فرم"
            subtitle="برای هر فیلد «نقطه جدید» بزنید و روی قاب کلیک کنید؛ بعد نقطه را بکشید تا دقیق جای خودش بنشیند."
            icon="pin"
          />
          <CardBody className="flex flex-col gap-2.5">
            {fields.map((field) => {
              const spots = placements
                .map((placement, index) => ({ placement, index }))
                .filter(({ placement }) => placement.field === field.key);
              const unusable = !field.key.trim();
              return (
                <div key={field.id} className="rounded-field border border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-fg">
                      {field.label || 'فیلد بی‌نام'}
                      {unusable ? (
                        <span className="ms-1 text-[11px] text-fg-subtle">(اول عنوان فیلد را بنویسید)</span>
                      ) : null}
                    </span>
                    {!readOnly ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="plus"
                        disabled={unusable || Boolean(pending)}
                        onClick={() => setPending({ field: field.key })}
                      >
                        نقطه
                      </Button>
                    ) : null}
                  </div>
                  {spots.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {spots.map(({ placement, index }) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelected(index)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                            selected === index
                              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10'
                              : 'border-line bg-card text-fg-muted hover:bg-card-2'
                          }`}
                        >
                          {placement.option ? `☑ ${placement.option}` : 'نقطه'}{' '}
                          {displayDigits(placement.x)}٪ / {displayDigits(placement.y)}٪
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {field.type === 'select'
                    ? (field.options ?? []).map((option) => {
                        const marked = spots.some(({ placement }) => placement.option === option);
                        return (
                          <div key={option} className="mt-1.5 flex items-center justify-between gap-2 border-t border-dashed border-line pt-1.5">
                            <span className="truncate text-[11.5px] text-fg-muted">☐ {option}</span>
                            {!readOnly ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="plus"
                                disabled={marked || unusable || Boolean(pending)}
                                onClick={() => setPending({ field: field.key, option })}
                              >
                                نشانه تیک
                              </Button>
                            ) : null}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
            {pending ? (
              <p className="flex items-center gap-2 rounded-field border border-brand-400 bg-brand-50 px-3 py-2 text-[12px] text-brand-700 dark:bg-brand-500/10">
                <Icon name="pin" size={14} />
                روی قاب فرم کلیک کنید تا {pending.option ? 'نشانه تیک' : 'نقطه'} «
                {pending.option ?? labelOf(pending.field)}» گذاشته شود.
                <button type="button" className="ms-auto underline" onClick={() => setPending(null)}>
                  لغو
                </button>
              </p>
            ) : null}
          </CardBody>
        </Card>

        {selectedPlacement ? (
          <Card>
            <CardHeader
              title={`تنظیمات ${selectedPlacement.option ? 'نشانه' : 'نقطه'} انتخاب‌شده`}
              subtitle={selectedPlacement.option ?? labelOf(selectedPlacement.field)}
              icon="settings"
              action={
                !readOnly ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    className="hover:text-danger-fg"
                    onClick={() => {
                      commit(placements.filter((_item, index) => index !== selected));
                      setSelected(null);
                    }}
                  >
                    حذف
                  </Button>
                ) : null
              }
            />
            <CardBody className="flex flex-col gap-3">
              {!selectedPlacement.option ? (
                <>
                  <NumberInput
                    label="عرض جای متغیر (٪ صفحه)"
                    value={selectedPlacement.width !== undefined ? String(Math.round(selectedPlacement.width)) : ''}
                    placeholder="خودکار"
                    max={100}
                    disabled={readOnly}
                    hint="خالی یعنی به‌اندازه متن؛ برای پوشیدن کل خط‌چین، عرض کل جای خالی را بدهید."
                    onChange={(value) =>
                      patch(selected!, {
                        width: value.trim() ? clamp(Number(value), 1, 100) : undefined,
                      })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="تراز متن"
                      value={selectedPlacement.align ?? 'right'}
                      disabled={readOnly}
                      options={ALIGN_OPTIONS}
                      onChange={(event) =>
                        patch(selected!, {
                          align: event.target.value as CanvasPlacement['align'],
                        })
                      }
                    />
                    <Select
                      label="اندازه قلم"
                      value={String(selectedPlacement.fontScale ?? 1)}
                      disabled={readOnly}
                      options={SCALE_OPTIONS}
                      onChange={(event) =>
                        patch(selected!, { fontScale: Number(event.target.value) })
                      }
                    />
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-fg-muted">
                  نشانه تیک فقط موقعیت دارد؛ وقتی این گزینه انتخاب شود، تیک روی مربعِ فرم می‌نشیند.
                </p>
              )}
            </CardBody>
          </Card>
        ) : null}
      </div>

      <div className="min-w-0">
        <div
          ref={sheetRef}
          dir="rtl"
          onClick={placeAt}
          className={`form-font relative mx-auto aspect-[210/297] w-full max-w-[150mm] overflow-hidden bg-white shadow-soft [container-type:size] ${
            pending ? 'cursor-crosshair' : ''
          }`}
        >
          {canvas.frame ? (
            <img
              src={canvas.frame}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none"
            />
          ) : (
            <div className="absolute inset-[8mm] flex items-center justify-center border border-dashed border-[#999] text-[3cqw] text-[#999]">
              قابی برای این فرم ثبت نشده است
            </div>
          )}
          {placements.map((placement, index) => {
            if (placement.option) {
              return (
                <div
                  key={index}
                  role="button"
                  title={placement.option}
                  onPointerDown={(event) => startDrag(event, index)}
                  onPointerMove={dragMove}
                  onPointerUp={endDrag}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-[2px] border bg-white/80 text-[#1f674c] ${
                    selected === index ? 'border-brand-500 ring-2 ring-brand-400/60' : 'border-dashed border-[#1f674c]'
                  } ${readOnly ? '' : 'cursor-move'}`}
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${CANVAS_CHECK_SIZE}cqw`,
                    height: `${CANVAS_CHECK_SIZE}cqw`,
                  }}
                >
                  <svg viewBox="0 0 10 10" className="h-full w-full p-[0.25cqw]" aria-hidden="true">
                    <path d="M 1.6 5.6 L 4.1 8 L 8.6 2.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              );
            }
            return (
              <div
                key={index}
                role="button"
                title={labelOf(placement.field)}
                onPointerDown={(event) => startDrag(event, index)}
                onPointerMove={dragMove}
                onPointerUp={endDrag}
                className={`absolute -translate-y-[52%] touch-none truncate whitespace-nowrap border bg-white/95 px-[0.4cqw] leading-[1.35] ${
                  selected === index
                    ? 'border-brand-500 text-brand-700 ring-2 ring-brand-400/60'
                    : 'border-dashed border-[#1f674c] text-[#1f674c]'
                } ${readOnly ? '' : 'cursor-move'}`}
                style={{
                  left: `${placement.x}%`,
                  top: `${placement.y}%`,
                  width: placement.width !== undefined ? `${placement.width}%` : undefined,
                  textAlign: placement.align ?? 'right',
                  fontSize: `${baseFont * (placement.fontScale ?? 1)}cqw`,
                }}
              >
                {labelOf(placement.field)}
              </div>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
          <Icon name="info" size={13} />
          هر نقطه دقیقاً همان‌جایی چاپ می‌شود که روی قاب دیده می‌شود؛ نقطه‌ها را بکشید و از پنل چپ عرض و ترازشان را تنظیم کنید.
        </p>
      </div>
    </div>
  );
}

/** تعداد نقاط ثبت‌شده برای یک فیلد (برای نمایش در تب فیلدها) */
export function canvasSpotCount(canvas: TemplateCanvas | undefined, key: string): number {
  return canvas?.placements.filter((placement) => placement.field === key).length ?? 0;
}
