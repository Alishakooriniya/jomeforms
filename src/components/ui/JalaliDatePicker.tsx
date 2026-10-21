import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { displayDigits } from '../../lib/format';
import {
  jalaliDateFromDate,
  jalaliMonthLength,
  jalaliPartsFromDate,
  normalizeJalaliDate,
  parseJalaliDate,
  jalaliToLocalDate,
} from '../../lib/jalali';
import { useClickOutside } from '../../lib/hooks';
import { cn } from '../../lib/utils';
import { Field } from './Field';
import { Icon } from './Icon';

const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  ariaLabel?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  containerClassName?: string;
  className?: string;
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  ariaLabel,
  hint,
  error,
  required,
  disabled,
  containerClassName,
  className,
}: JalaliDatePickerProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseJalaliDate(value);
  const today = jalaliDateFromDate(new Date());
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selected ?? jalaliPartsFromDate(new Date());
    return { year: initial.year, month: initial.month };
  });
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

  const monthLength = jalaliMonthLength(visibleMonth.year, visibleMonth.month);
  const firstDay = jalaliToLocalDate(`${visibleMonth.year}/${String(visibleMonth.month).padStart(2, '0')}/01`);
  const leadingEmptyDays = firstDay ? (firstDay.getDay() + 1) % 7 : 0;
  const days = useMemo(
    () => Array.from({ length: monthLength }, (_, index) => index + 1),
    [monthLength],
  );
  const inputError =
    error ??
    (value && value.replace(/\D/g, '').length >= 8 && !selected
      ? 'تاریخ باید شمسی و به‌شکل ۱۴۰۵/۰۷/۳۰ باشد.'
      : undefined);

  const changeMonth = (offset: number) => {
    const absoluteMonth = visibleMonth.year * 12 + visibleMonth.month - 1 + offset;
    setVisibleMonth({
      year: Math.floor(absoluteMonth / 12),
      month: ((absoluteMonth % 12) + 12) % 12 + 1,
    });
  };

  const selectDay = (day: number) => {
    const normalized = normalizeJalaliDate(
      `${visibleMonth.year}/${String(visibleMonth.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
    );
    if (!normalized) return;
    onChange(normalized);
    setOpen(false);
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={inputError}
      required={required}
      htmlFor={inputId}
      className={containerClassName}
    >
      <div ref={rootRef} className="relative">
        <div className="relative flex items-center">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            aria-label={ariaLabel}
            aria-invalid={Boolean(inputError)}
            required={required}
            disabled={disabled}
            placeholder="۱۴۰۵/۰۱/۰۱"
            className={cn('field pe-10 text-left', inputError && 'field-invalid', className)}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => {
              const current = parseJalaliDate(value) ?? jalaliPartsFromDate(new Date());
              setVisibleMonth({ year: current.year, month: current.month });
            }}
          />
          <button
            type="button"
            aria-label="بازکردن تقویم شمسی"
            aria-expanded={open}
            disabled={disabled}
            className="absolute end-2 inline-flex h-7 w-7 items-center justify-center rounded-field text-fg-subtle hover:bg-card-2 hover:text-fg disabled:opacity-50"
            onClick={() => {
              if (!open) {
                const current = parseJalaliDate(value) ?? jalaliPartsFromDate(new Date());
                setVisibleMonth({ year: current.year, month: current.month });
              }
              setOpen((current) => !current);
            }}
          >
            <Icon name="calendar" size={15} />
          </button>
        </div>

        {open && !disabled ? (
          <div
            role="dialog"
            aria-label="تقویم شمسی"
            className="absolute z-40 mt-1 w-64 rounded-card border border-line bg-card p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="ماه قبل"
                className="inline-flex h-8 w-8 items-center justify-center rounded-field text-fg-muted hover:bg-card-2"
                onClick={() => changeMonth(-1)}
              >
                <Icon name="chevron-right" size={15} />
              </button>
              <p className="text-[12px] font-semibold text-fg">
                {MONTHS[visibleMonth.month - 1]} {displayDigits(visibleMonth.year)}
              </p>
              <button
                type="button"
                aria-label="ماه بعد"
                className="inline-flex h-8 w-8 items-center justify-center rounded-field text-fg-muted hover:bg-card-2"
                onClick={() => changeMonth(1)}
              >
                <Icon name="chevron-left" size={15} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="py-1 text-[10px] font-medium text-fg-subtle">
                  {weekday}
                </span>
              ))}
              {Array.from({ length: leadingEmptyDays }, (_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {days.map((day) => {
                const dateValue = `${visibleMonth.year}/${String(visibleMonth.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                const isSelected = selected?.year === visibleMonth.year && selected.month === visibleMonth.month && selected.day === day;
                const isToday = today === dateValue;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(
                      'h-8 rounded-field text-[11px] transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15',
                      isSelected && 'bg-brand-600 font-semibold text-white hover:bg-brand-700 hover:text-white',
                      !isSelected && isToday && 'ring-1 ring-brand-500 text-brand-700 dark:text-brand-300',
                    )}
                    onClick={() => selectDay(day)}
                  >
                    {displayDigits(day)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
}
