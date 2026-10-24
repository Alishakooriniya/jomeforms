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
import { cn, onlyDigits } from '../../lib/utils';
import { Field, Select, TextInput } from './Field';
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
  const [yearInput, setYearInput] = useState(() =>
    String((selected ?? jalaliPartsFromDate(new Date())).year),
  );
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
    const nextMonth = {
      year: Math.floor(absoluteMonth / 12),
      month: ((absoluteMonth % 12) + 12) % 12 + 1,
    };
    setVisibleMonth(nextMonth);
    setYearInput(String(nextMonth.year));
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
            dir="rtl"
            aria-label={ariaLabel}
            aria-invalid={Boolean(inputError)}
            required={required}
            disabled={disabled}
            placeholder="۱۴۰۵/۰۱/۰۱"
            className={cn('field pe-10 text-right', inputError && 'field-invalid', className)}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => {
              const current = parseJalaliDate(value) ?? jalaliPartsFromDate(new Date());
              setVisibleMonth({ year: current.year, month: current.month });
              setYearInput(String(current.year));
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
                setYearInput(String(current.year));
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
            dir="rtl"
            className="absolute end-0 z-40 mt-1 w-64 rounded-card border border-line bg-card p-3 shadow-lg"
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
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                <Select
                  aria-label="انتخاب ماه"
                  className="h-8 min-h-0 w-[108px] py-1 text-center text-[11px]"
                  options={MONTHS.map((month, index) => ({
                    value: String(index + 1),
                    label: month,
                  }))}
                  value={String(visibleMonth.month)}
                  onChange={(event) =>
                    setVisibleMonth((current) => ({ ...current, month: Number(event.target.value) }))
                  }
                />
                <TextInput
                  aria-label="انتخاب سال"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={4}
                  className="h-8 min-h-0 w-[76px] px-2 py-1 text-center text-[11px]"
                  value={displayDigits(yearInput)}
                  onChange={(event) => {
                    const nextValue = onlyDigits(event.target.value);
                    setYearInput(nextValue);
                    const year = Number(nextValue);
                    if (Number.isInteger(year) && year >= 1000 && year <= 3000) {
                      setVisibleMonth((current) => ({ ...current, year }));
                    }
                  }}
                  onBlur={() => {
                    const year = Number(yearInput);
                    if (!Number.isInteger(year) || year < 1000 || year > 3000) {
                      setYearInput(String(visibleMonth.year));
                    }
                  }}
                />
              </div>
              <button
                type="button"
                aria-label="ماه بعد"
                className="inline-flex h-8 w-8 items-center justify-center rounded-field text-fg-muted hover:bg-card-2"
                onClick={() => changeMonth(1)}
              >
                <Icon name="chevron-left" size={15} />
              </button>
            </div>

            <div dir="rtl" className="grid grid-cols-7 gap-1 text-center">
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
