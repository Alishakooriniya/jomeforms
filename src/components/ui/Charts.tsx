/* نمودارهای سبک — فقط CSS و SVG درون‌خطی (بدون کتابخانه نمودار) */

import { cn } from '../../lib/utils';
import { displayDigits } from '../../lib/format';
import type { Tone } from '../../data/labels';

const TONE_COLOR: Record<Tone, string> = {
  brand: 'var(--brand-500)',
  success: 'var(--c-success)',
  warn: 'var(--c-warn)',
  danger: 'var(--c-danger)',
  info: 'var(--c-info)',
  neutral: 'var(--border-strong)',
};

export interface BarDatum {
  label: string;
  value: number;
  /** مقدار دوم برای نمودار دو‌سری (اختیاری) */
  secondary?: number;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  tone?: Tone;
  secondaryTone?: Tone;
  formatValue?: (value: number) => string;
  className?: string;
  showValues?: boolean;
}

/** نمودار ستونی ساده با ستون‌های HTML (سبک‌تر از SVG برای انیمیشن) */
export function BarChart({
  data,
  height = 150,
  tone = 'brand',
  secondaryTone = 'info',
  formatValue = (value) => displayDigits(value),
  className,
  showValues = true,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((item) => Math.max(item.value, item.secondary ?? 0)));

  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height }}>
      {data.map((item) => (
        <div key={item.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="num text-[10px] text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">
            {showValues ? formatValue(item.value) : ''}
          </span>
          <div className="flex w-full items-end justify-center gap-1" style={{ height: '100%' }}>
            <div
              className="w-full max-w-6 rounded-t-[4px] transition-all"
              style={{
                height: `${Math.max(2, (item.value / max) * 100)}%`,
                background: TONE_COLOR[tone],
                opacity: 0.9,
              }}
              title={`${item.label}: ${formatValue(item.value)}`}
            />
            {item.secondary !== undefined ? (
              <div
                className="w-full max-w-6 rounded-t-[4px] transition-all"
                style={{
                  height: `${Math.max(2, (item.secondary / max) * 100)}%`,
                  background: TONE_COLOR[secondaryTone],
                  opacity: 0.45,
                }}
                title={`${item.label}: ${formatValue(item.secondary)}`}
              />
            ) : null}
          </div>
          <span className="w-full truncate text-center text-[10px] text-fg-subtle">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface DonutDatum {
  label: string;
  value: number;
  tone: Tone;
}

export interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

/** نمودار دونات با SVG و stroke-dasharray */
export function DonutChart({
  data,
  size = 148,
  thickness = 15,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--card-2)"
            strokeWidth={thickness}
          />
          {total > 0
            ? data.map((item) => {
                const length = (item.value / total) * circumference;
                const dash = `${length} ${circumference - length}`;
                const circle = (
                  <circle
                    key={item.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={TONE_COLOR[item.tone]}
                    strokeWidth={thickness}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += length;
                return circle;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-lg font-semibold text-fg">{centerValue ?? displayDigits(total)}</span>
          {centerLabel ? <span className="text-[10.5px] text-fg-subtle">{centerLabel}</span> : null}
        </div>
      </div>

      <ul className="flex min-w-32 flex-col gap-2">
        {data.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[item.tone] }} />
              {item.label}
            </span>
            <span className="num font-medium text-fg">{displayDigits(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
