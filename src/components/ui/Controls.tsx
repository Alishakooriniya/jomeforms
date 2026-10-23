/* کنترل‌های فرم: چک‌باکس، کلید، ورودی مبلغ/عدد، گروه رادیویی و چیدمان فرم */

import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn, onlyDigits, toLatinDigits } from '../../lib/utils';
import { Field } from './Field';
import { Icon } from './Icon';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  hint?: ReactNode;
}

export function Checkbox({ label, hint, className, ...rest }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-3 text-[14px] text-fg">
      <span className="relative mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        <input type="checkbox" className={cn('peer h-[22px] w-[22px] cursor-pointer appearance-none rounded-[6px] border border-line-strong bg-card transition-colors checked:border-brand-600 checked:bg-brand-600', className)} {...rest} />
        <Icon name="check" size={12} bold className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="flex flex-col gap-0.5">
        {label ? <span>{label}</span> : null}
        {hint ? <span className="text-[13px] text-fg-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, hint, disabled, id }: SwitchProps) {
  const button = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-[52px] shrink-0 rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-brand-600 bg-brand-600' : 'border-line-strong bg-card-2',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'end-0.5' : 'start-0.5',
        )}
      />
    </button>
  );
  if (!label) return button;
  return (
    <div className="flex items-start gap-3">
      {button}
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer text-[14px] font-medium text-fg">
          {label}
        </label>
        {hint ? <span className="text-[13px] text-fg-muted">{hint}</span> : null}
      </div>
    </div>
  );
}

export interface CurrencyInputProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  containerClassName?: string;
}

/** ورودی مبلغ: جداکننده هزارگان هنگام تایپ، ذخیره به شکل رقم خام */
export function CurrencyInput({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  required,
  containerClassName,
}: CurrencyInputProps) {
  const digits = onlyDigits(value);
  const shown = digits ? Number(digits).toLocaleString('en-US') : '';
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative flex items-center">
        <input
          className={cn('field num pe-16', error && 'field-invalid')}
          value={shown}
          inputMode="numeric"
          placeholder={placeholder ?? '0'}
          onChange={(event) => onChange(onlyDigits(toLatinDigits(event.target.value)))}
        />
        <span className="pointer-events-none absolute end-3 text-[11px] text-fg-subtle">تومان</span>
      </div>
    </Field>
  );
}

export interface NumberInputProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  suffix?: string;
  max?: number;
  containerClassName?: string;
}

export function NumberInput({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  suffix,
  max,
  containerClassName,
}: NumberInputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative flex items-center">
        <input
          className={cn('field num', suffix && 'pe-14', error && 'field-invalid')}
          value={value}
          disabled={disabled}
          inputMode="numeric"
          placeholder={placeholder ?? '0'}
          onChange={(event) => {
            const next = onlyDigits(event.target.value);
            onChange(max !== undefined && Number(next) > max ? String(max) : next);
          }}
        />
        {suffix ? <span className="pointer-events-none absolute end-3 text-[11px] text-fg-subtle">{suffix}</span> : null}
      </div>
    </Field>
  );
}

export interface RadioGroupProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  columns?: 2 | 3;
}

export function RadioGroup({ label, value, onChange, options, columns = 2 }: RadioGroupProps) {
  return (
    <Field label={label}>
      <div className={cn('grid gap-2', columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-start gap-2.5 rounded-field border p-2.5 text-start transition-colors',
                active ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-line bg-card hover:bg-card-2',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  active ? 'border-brand-600' : 'border-line-strong',
                )}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-brand-600" /> : null}
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] font-medium text-fg">{option.label}</span>
                {option.description ? (
                  <span className="text-[11px] text-fg-subtle">{option.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** چیدمان دو/سه‌ستونه فرم‌ها */
export function FormGrid({ children, columns = 2, className }: { children: ReactNode; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'md:grid-cols-2',
        columns === 3 && 'md:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** نوار دکمه‌های پایین فرم */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4', className)}>
      {children}
    </div>
  );
}
