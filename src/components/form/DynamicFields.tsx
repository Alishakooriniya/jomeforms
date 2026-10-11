/* نمایش پویای فیلدهای یک قالب فرم.
   همین کامپوننت در ساخت سند، ویرایش سند و پیش‌نمایش قالب استفاده می‌شود. */

import { useMemo } from 'react';
import type { Client, TemplateField } from '../../types';
import { isValidMobile, isValidNationalId } from '../../lib/crypto';
import { dateInputHint, formatMoney } from '../../lib/format';
import { clientSourceValue, sourceLabel } from '../../lib/template';
import { CurrencyInput, FormGrid, NumberInput, Switch } from '../ui/Controls';
import { Select, TextInput, Textarea } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';

export interface DynamicFieldsProps {
  fields: TemplateField[];
  values: Record<string, string>;
  onChange?: (key: string, value: string) => void;
  errors?: Record<string, string>;
  /** پرونده مبدأ برای نمایش نشان «از پرونده» */
  client?: Client;
  readOnly?: boolean;
  columns?: 2 | 3;
}

const WIDE_TYPES = new Set<TemplateField['type']>(['textarea']);

export function DynamicFields({
  fields,
  values,
  onChange,
  errors = {},
  client,
  readOnly,
  columns = 2,
}: DynamicFieldsProps) {
  const groups = useMemo(() => {
    const map = new Map<string, TemplateField[]>();
    fields.forEach((field) => {
      const key = field.group?.trim() || '';
      const list = map.get(key) ?? [];
      list.push(field);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [fields]);

  const handle = (key: string, value: string) => onChange?.(key, value);

  const renderField = (field: TemplateField) => {
    const value = values[field.key] ?? '';
    const error = errors[field.key];
    const autoFilled = Boolean(
      client && field.source && value && clientSourceValue(client, field.source) === value,
    );
    const label = (
      <span className="flex flex-wrap items-center gap-1.5">
        {field.label}
        {autoFilled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-normal text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Icon name="sparkles" size={10} />
            از پرونده
          </span>
        ) : null}
      </span>
    );
    const wrapperClass = WIDE_TYPES.has(field.type) ? 'md:col-span-2' : undefined;
    const common = {
      label,
      error,
      required: field.required,
      hint: field.help,
      containerClassName: wrapperClass,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...common}
            className="min-h-24"
            placeholder={field.placeholder}
            value={value}
            disabled={readOnly}
            onChange={(event) => handle(field.key, event.target.value)}
          />
        );

      case 'select':
        return (
          <Select
            {...common}
            value={value}
            disabled={readOnly}
            placeholder="انتخاب کنید"
            options={buildOptions(field, value)}
            onChange={(event) => handle(field.key, event.target.value)}
          />
        );

      case 'checkbox':
        return (
          <div className="flex flex-col gap-1.5 pt-1.5">
            <span className="text-xs font-medium text-fg-muted">{label}</span>
            <Switch
              checked={value === 'true' || value === '1'}
              disabled={readOnly}
              label={value === 'true' || value === '1' ? 'بله' : 'خیر'}
              onChange={(checked) => handle(field.key, checked ? 'true' : 'false')}
            />
            {error ? <p className="text-[11px] text-danger-fg">{error}</p> : null}
          </div>
        );

      case 'currency':
        return (
          <CurrencyInput
            {...common}
            value={value}
            placeholder={field.placeholder}
            onChange={(next) => handle(field.key, next)}
          />
        );

      case 'number':
        return (
          <NumberInput
            {...common}
            value={value}
            suffix={field.suffix}
            placeholder={field.placeholder}
            onChange={(next) => handle(field.key, next)}
          />
        );

      case 'percent':
        return (
          <NumberInput
            {...common}
            value={value}
            suffix="٪"
            placeholder={field.placeholder ?? '0.5'}
            onChange={(next) => handle(field.key, next)}
          />
        );

      case 'date':
        return (
          <TextInput
            {...common}
            type="date"
            value={value}
            disabled={readOnly}
            hint={value ? dateInputHint(value) : (field.help ?? 'تاریخ شمسی نمایش داده می‌شود')}
            onChange={(event) => handle(field.key, event.target.value)}
          />
        );

      case 'nationalId':
        return (
          <TextInput
            {...common}
            value={value}
            inputMode="numeric"
            disabled={readOnly}
            maxLength={10}
            placeholder="۱۰ رقم"
            onChange={(event) => handle(field.key, event.target.value)}
            hint={
              value && !isValidNationalId(value)
                ? 'کد ملی معتبر به نظر نمی‌رسد؛ در صورت نیاز اصلاح کنید.'
                : field.help
            }
            error={error}
          />
        );

      case 'mobile':
        return (
          <TextInput
            {...common}
            value={value}
            inputMode="tel"
            disabled={readOnly}
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            onChange={(event) => handle(field.key, event.target.value)}
            hint={value && !isValidMobile(value) ? 'شماره موبایل ۱۱ رقمی با ۰۹ شروع شود.' : field.help}
            error={error}
          />
        );

      default:
        return (
          <TextInput
            {...common}
            value={value}
            disabled={readOnly}
            placeholder={field.placeholder}
            suffix={field.suffix}
            onChange={(event) => handle(field.key, event.target.value)}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([group, groupFields]) => (
        <section key={group || 'default'} className={cn(group && 'rounded-card border border-line bg-card-2/40 p-3.5')}>
          {group ? (
            <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-fg">
              <span className="h-3.5 w-1 rounded-full bg-brand-500" />
              {group}
            </h3>
          ) : null}
          <FormGrid columns={columns}>
            {groupFields.map((field) => (
              <div key={field.id} className={WIDE_TYPES.has(field.type) ? 'md:col-span-2' : undefined}>
                {renderField(field)}
              </div>
            ))}
          </FormGrid>
        </section>
      ))}

      {client ? (
        <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
          <Icon name="info" size={13} />
          فیلدهای دارای نشان «از پرونده» به‌صورت خودکار از پرونده پر می‌شوند و قابل ویرایش‌اند.
        </p>
      ) : null}
    </div>
  );
}

/** اگر مقدار ذخیره‌شده در فهرست گزینه‌ها نباشد، به‌عنوان گزینه اضافه نمایش داده می‌شود */
function buildOptions(field: TemplateField, value: string): Array<{ value: string; label: string }> {
  const options = (field.options ?? []).map((option) => ({ value: option, label: option }));
  if (value && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: value });
  }
  return options;
}

export function fieldLabel(field: TemplateField): string {
  return field.source ? `${field.label} (از ${sourceLabel(field.source)})` : field.label;
}

/** خلاصه‌ی خوانا از مقادیر برای نمایش در کارت‌ها */
export function formatValuePreview(field: TemplateField, value: string): string {
  if (!value) return '—';
  if (field.type === 'currency') return formatMoney(Number(value));
  if (field.type === 'checkbox') return value === 'true' ? 'بله' : 'خیر';
  if (field.type === 'percent') return `${value}٪`;
  return value;
}
