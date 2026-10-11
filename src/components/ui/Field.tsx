/* اجزای پایه فرم: برچسب، راهنما، خطا + ورودی متن/چندخطی/انتخابی */

import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  /** برچسب کوچک در سمت چپ عنوان */
  action?: ReactNode;
}

/** پوشش استاندارد فیلدها (برچسب + راهنما + خطا) */
export function Field({ label, hint, error, required, htmlFor, children, className, action }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-xs font-medium text-fg-muted">
            {label}
            {required ? <span className="ms-0.5 text-danger">*</span> : null}
          </label>
          {action}
        </div>
      ) : null}
      {children}
      {error ? <p className="text-[11px] leading-4 text-danger-fg">{error}</p> : null}
      {!error && hint ? <p className="text-[11px] leading-4 text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'ref'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  icon?: IconName;
  /** محتوای سمت چپ کادر مثل واحد یا شمارنده */
  suffix?: ReactNode;
  containerClassName?: string;
  /** ارجاع به المان ورودی (برای فوکوس/درج نشانه در قالب‌ها) */
  ref?: Ref<HTMLInputElement>;
}

export function TextInput({
  label,
  hint,
  error,
  icon,
  suffix,
  className,
  containerClassName,
  id,
  required,
  ref,
  ...rest
}: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} className={containerClassName}>
      <div className="relative flex items-center">
        {icon ? (
          <span className="pointer-events-none absolute start-3 text-fg-subtle">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          required={required}
          className={cn('field', icon && 'ps-9', suffix && 'pe-14', error && 'field-invalid', className)}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute end-3 text-[11px] text-fg-subtle">{suffix}</span>
        ) : null}
      </div>
    </Field>
  );
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  hint,
  error,
  className,
  containerClassName,
  id,
  required,
  ref,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} className={containerClassName}>
      <textarea
        id={inputId}
        ref={ref}
        required={required}
        className={cn('field resize-y leading-6', error && 'field-invalid', className)}
        {...rest}
      />
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  containerClassName,
  id,
  required,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} className={containerClassName}>
      <div className="relative">
        <select
          id={inputId}
          required={required}
          className={cn('field appearance-none pe-8', error && 'field-invalid', className)}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-fg-subtle">
          <Icon name="chevron-down" size={14} />
        </span>
      </div>
    </Field>
  );
}
