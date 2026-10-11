/* نوار ابزار فهرست‌ها: جستجو، فیلتر و تراشه‌های فیلتر فعال */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useDebouncedValue } from '../../lib/hooks';
import { displayDigits } from '../../lib/format';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Select } from './Field';

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/** جستجوی زنده با تأخیر کوتاه تا تایپ روان بماند */
export function SearchInput({ value, onChange, placeholder = 'جستجو…', className, autoFocus }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const debounced = useDebouncedValue(local, 220);
  const firstRun = useRef(true);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    changeRef.current(debounced);
  }, [debounced]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="pointer-events-none absolute start-3 text-fg-subtle">
        <Icon name="search" size={15} />
      </span>
      <input
        type="search"
        value={local}
        autoFocus={autoFocus}
        onChange={(event) => setLocal(event.target.value)}
        placeholder={placeholder}
        className="field ps-9 pe-8"
      />
      {local ? (
        <button
          type="button"
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          className="absolute end-2 rounded-md p-1 text-fg-subtle hover:bg-card-2 hover:text-fg"
          aria-label="پاک‌کردن جستجو"
        >
          <Icon name="close" size={13} />
        </button>
      ) : null}
    </div>
  );
}

export interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  className?: string;
  icon?: IconName;
}

/** فیلتر کشویی سبک (بدون برچسب، فقط انتخاب) */
export function FilterSelect({ value, onChange, options, placeholder, className, icon }: FilterSelectProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      {icon ? (
        <span className="pointer-events-none absolute start-3 z-10 text-fg-subtle">
          <Icon name={icon} size={14} />
        </span>
      ) : null}
      <Select
        value={value || 'all'}
        onChange={(event) => onChange(event.target.value)}
        options={[{ value: 'all', label: placeholder }, ...options]}
        className={cn('h-9 py-0 text-[12.5px]', icon && 'ps-8')}
        containerClassName="w-full"
        aria-label={placeholder}
      />
    </div>
  );
}

export interface FilterBarProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** نوار فیلترها — در موبایل به‌صورت گرید جمع‌شده نمایش داده می‌شود */
export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <div className={cn('card flex flex-wrap items-center gap-2 p-3', className)}>
      {children}
      {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="chip">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-fg-subtle transition-colors hover:bg-card hover:text-fg"
        aria-label={`حذف فیلتر ${label}`}
      >
        <Icon name="close" size={11} />
      </button>
    </span>
  );
}

export function ResultsSummary({ total, unit = 'مورد', className }: { total: number; unit?: string; className?: string }) {
  return (
    <p className={cn('num text-[11.5px] text-fg-subtle', className)}>
      {displayDigits(total)} {unit}
    </p>
  );
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: IconName }>;
  className?: string;
}

export function SegmentedControl<T extends string>({ value, onChange, options, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-btn border border-line bg-card p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[calc(var(--radius-btn)-2px)] px-2.5 py-1.5 text-[12px] transition-colors',
              active ? 'bg-brand-600 text-white' : 'text-fg-muted hover:bg-card-2 hover:text-fg',
            )}
          >
            {option.icon ? <Icon name={option.icon} size={13} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
