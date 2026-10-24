/* نوار ابزار فهرست‌ها: جستجو، فیلترهای اصلی، فیلترهای بیشتر (جمع‌شده)
   و تراشه‌های فیلتر فعال. الگوی واحد همه فهرست‌های CRM. */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useClickOutside, useDebouncedValue } from '../../lib/hooks';
import { displayDigits } from '../../lib/format';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Select } from './Field';
import { CountBadge } from './Badge';

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
    <div className={cn('relative flex w-full min-w-0 items-center sm:w-auto sm:flex-1 sm:max-w-80', className)}>
      <span className="pointer-events-none absolute start-3 text-fg-subtle">
        <Icon name="search" size={14} />
      </span>
      <input
        type="search"
        value={local}
        autoFocus={autoFocus}
        onChange={(event) => setLocal(event.target.value)}
        placeholder={placeholder}
        className="field ps-9 pe-8"
        aria-label={placeholder}
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
          <Icon name="close" size={12} />
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
        <span className="pointer-events-none absolute start-2.5 z-10 text-fg-subtle">
          <Icon name={icon} size={13} />
        </span>
      ) : null}
      <Select
        value={value || 'all'}
        onChange={(event) => onChange(event.target.value)}
        options={[{ value: 'all', label: placeholder }, ...options]}
        className={cn('h-9 min-h-9 pe-7 text-[12px]', icon ? 'ps-8' : 'ps-2.5')}
        containerClassName="w-full"
        aria-label={placeholder}
      />
    </div>
  );
}

export interface ListToolbarProps {
  /** جستجو و فیلترهای همیشه‌مرئی */
  children: ReactNode;
  /** فیلترهای کم‌کاربرد؛ داخل بخش تاشو نمایش داده می‌شوند */
  advanced?: ReactNode;
  advancedCount?: number;
  activeFilters?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * نوار ابزار استاندارد فهرست‌ها.
 * اصل طراحی: جستجو و یک یا دو فیلتر اصلی همیشه پیدا باشند؛ بقیه فیلترها
 * با یک کلیک باز شوند تا صفحه شلوغ نشود.
 */
export function ListToolbar({
  children,
  advanced,
  advancedCount = 0,
  activeFilters,
  summary,
  actions,
  className,
}: ListToolbarProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className={cn('card', className)} ref={panelRef}>
      <div className="flex flex-wrap items-center gap-2 p-2">
        {children}
        {advanced ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-btn border px-2.5 text-[12px] transition-colors',
              open || advancedCount
                ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/12 dark:text-brand-200'
                : 'border-line bg-card text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            <Icon name="filter" size={13} />
            فیلتر بیشتر
            {advancedCount ? <CountBadge value={advancedCount} tone="brand" /> : null}
            <Icon name="chevron-down" size={12} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        ) : null}

        {actions ? <div className="ms-auto flex items-center gap-1.5">{actions}</div> : null}
        {!actions && summary ? <div className="ms-auto pe-1">{summary}</div> : null}
      </div>

      {advanced && open ? (
        <div className="border-t border-line bg-card-2/40 px-3 py-3">
          <div className="flex flex-wrap items-end gap-3">{advanced}</div>
        </div>
      ) : null}

      {activeFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line/70 px-3 py-2">{activeFilters}</div>
      ) : null}
    </div>
  );
}

/** برای سازگاری با صفحه‌های قدیمی‌تر */
export function FilterBar({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('card flex flex-wrap items-center gap-2 p-2', className)}>
      {children}
      {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 text-[10.5px] text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-brand-700/70 transition-colors hover:bg-brand-100 hover:text-brand-900 dark:text-brand-200/70 dark:hover:bg-brand-500/20 dark:hover:text-brand-100"
        aria-label={`حذف فیلتر ${label}`}
      >
        <Icon name="close" size={10} />
      </button>
    </span>
  );
}

export function ResultsSummary({ total, unit = 'مورد', className }: { total: number; unit?: string; className?: string }) {
  return (
    <p className={cn('num whitespace-nowrap text-[11px] text-fg-subtle', className)}>
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
    <div className={cn('inline-flex items-center gap-0.5 rounded-btn border border-line bg-card p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-[calc(var(--radius-btn)-2px)] px-2.5 text-[12px] transition-colors',
              active ? 'bg-brand-600 font-medium text-white' : 'text-fg-muted hover:bg-card-2 hover:text-fg',
            )}
          >
            {option.icon ? <Icon name={option.icon} size={12} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** برچسب کوچک برای فیلدهای داخل پنل فیلترهای بیشتر */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-36 flex-col gap-1">
      <span className="text-[10.5px] text-fg-subtle">{label}</span>
      {children}
    </label>
  );
}
