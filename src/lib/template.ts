/* موتور جایگزینی داده در قالب فرم‌ها.
   متن قالب شامل نشانه‌هایی مانند {{seller_name}} است؛ هنگام ساخت سند
   مقدار هر نشانه از اطلاعات پرونده پر می‌شود (به‌جای نوشتن دستی). */

import type { Client, FormTemplate, TemplateField } from '../types';
import { displayDigits, formatDate, formatMoney, formatNumber, formatPercent } from './format';
import { normalizeText, toLatinDigits } from './utils';

export const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/** نشانه‌های سیستمی که همیشه پر می‌شوند */
export const SYSTEM_TOKENS: Record<string, string> = {
  __today: 'امروز',
  __date: 'تاریخ تنظیم سند',
  __doc_number: 'شماره سند',
  __client_name: 'نام پرونده',
  __client_code: 'شماره پرونده',
  __org_name: 'نام سازمان',
};

export function extractTokens(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(TOKEN_PATTERN)) found.add(match[1]);
  return Array.from(found);
}

export interface TokenInfo {
  key: string;
  label: string;
  inFields: boolean;
  used: boolean;
}

/** فهرست نشانه‌های قالب + وضعیت تعریف‌شدن در فیلدها */
export function analyzeTokens(template: Pick<FormTemplate, 'body' | 'fields'>): TokenInfo[] {
  const used = extractTokens(template.body);
  const fieldKeys = new Set(template.fields.map((field) => field.key));
  const infos: TokenInfo[] = template.fields.map((field) => ({
    key: field.key,
    label: field.label,
    inFields: true,
    used: used.includes(field.key),
  }));
  used.forEach((key) => {
    if (!fieldKeys.has(key)) infos.push({ key, label: SYSTEM_TOKENS[key] ?? key, inFields: false, used: true });
  });
  return infos;
}

/** پیش‌نمایش متن با داده‌های نمونه (برای سازنده قالب) */
export function previewValues(fields: TemplateField[]): Record<string, string> {
  const values: Record<string, string> = {};
  fields.forEach((field) => {
    if (field.defaultValue) {
      values[field.key] = field.defaultValue;
      return;
    }
    const label = `${field.label}`;
    values[field.key] = `«${label}»`;
  });
  return values;
}

/** قالب‌بندی مقدار یک فیلد بر اساس نوع آن */
export function formatFieldValue(field: TemplateField | undefined, raw: string): string {
  if (!raw) return '';
  const type = field?.type ?? 'text';
  switch (type) {
    case 'currency': {
      const value = Number(toLatinDigits(raw).replace(/[^\d.-]/g, ''));
      return Number.isFinite(value) ? formatMoney(value) : raw;
    }
    case 'number': {
      const value = Number(toLatinDigits(raw).replace(/[^\d.-]/g, ''));
      return Number.isFinite(value) ? formatNumber(value) : raw;
    }
    case 'percent': {
      const value = Number(toLatinDigits(raw).replace(/[^\d.-]/g, ''));
      return Number.isFinite(value) ? formatPercent(value) : raw;
    }
    case 'date':
      return formatDate(raw, 'long');
    case 'checkbox':
      return raw === 'true' || raw === '1' ? 'بله' : 'خیر';
    default:
      // در متن قرارداد، شماره‌ها و مقادیر با ارقام فارسی نمایش داده می‌شوند
      return persianText(raw);
  }
}

/** ارقام لاتین → فارسی برای متن سند (بدون دست‌زدن به متن انگلیسی) */
function persianText(value: string): string {
  return /[\u0600-\u06FF]/.test(value) || /^[0-9\-/٪]+$/.test(value) ? displayDigits(value) : value;
}

export interface RenderContext {
  docNumber?: string;
  clientName?: string;
  clientCode?: string;
  orgName?: string;
  date?: string;
  /** جایگزین مقدارهای خالی (در چاپ بهتر است نقطه‌چین باشد) */
  emptyPlaceholder?: string;
}

/** جایگزینی نهایی نشانه‌ها در متن */
export function renderTemplate(
  body: string,
  fields: TemplateField[],
  values: Record<string, string>,
  context: RenderContext = {},
): string {
  const fieldMap = new Map(fields.map((field) => [field.key, field]));
  const empty = context.emptyPlaceholder ?? '';
  const systemValues: Record<string, string> = {
    __today: formatDate(context.date, 'long'),
    __date: formatDate(context.date, 'long'),
    __doc_number: context.docNumber ?? '',
    __client_name: context.clientName ?? '',
    __client_code: context.clientCode ?? '',
    __org_name: context.orgName ?? '',
  };
  return body.replace(TOKEN_PATTERN, (_match, key: string) => {
    if (key in systemValues) {
      const value = systemValues[key];
      return value || empty;
    }
    const field = fieldMap.get(key);
    const raw = values[key] ?? '';
    if (!raw) return empty;
    return formatFieldValue(field, raw);
  });
}

/** متن کامل سند: سرصفحه + متن قالب + پاصفحه */
export function renderDocument(
  template: FormTemplate,
  values: Record<string, string>,
  context: RenderContext = {},
): { header: string; body: string; footer: string } {
  const render = (text?: string) => (text ? renderTemplate(text, template.fields, values, context) : '');
  return {
    header: render(template.headerNote),
    body: render(template.body),
    footer: render(template.footerNote),
  };
}

/* ------------------- پیش‌پرکردن خودکار از پرونده ------------------- */

export interface SourceOption {
  key: string;
  label: string;
  group: string;
}

/** کلیدهای قابل نگاشت از پرونده به فیلدهای قالب */
export const CLIENT_SOURCES: SourceOption[] = [
  { key: 'code', label: 'شماره پرونده', group: 'پرونده' },
  { key: 'fullName', label: 'نام و نام خانوادگی', group: 'پرونده' },
  { key: 'nationalId', label: 'کد ملی', group: 'پرونده' },
  { key: 'mobile', label: 'موبایل', group: 'پرونده' },
  { key: 'phone', label: 'تلفن ثابت', group: 'پرونده' },
  { key: 'fatherName', label: 'نام پدر', group: 'پرونده' },
  { key: 'birthDate', label: 'تاریخ تولد', group: 'پرونده' },
  { key: 'address', label: 'نشانی محل سکونت', group: 'پرونده' },
];

export function sourceLabel(key?: string): string {
  if (!key) return '';
  return CLIENT_SOURCES.find((option) => option.key === key)?.label ?? key;
}

/** مقدار یک کلید پرونده به شکل رشته (برای جایگزینی در فرم) */
export function clientSourceValue(client: Client | undefined, key?: string): string {
  if (!client || !key) return '';
  const raw = key === 'address' ? client.residenceAddress : (client as unknown as Record<string, unknown>)[key];
  if (raw === undefined || raw === null) return '';
  return String(raw);
}

/** مقدار خلاصه‌ی خوانا برای پیش‌پرکردن (مبلغ با واحد) */
export function sourceDisplay(client: Client | undefined, key?: string): string {
  if (!client || !key) return '';
  switch (key) {
    case 'birthDate':
      return formatDate(client.birthDate, 'long');
    default:
      return clientSourceValue(client, key);
  }
}

/** ساخت مقادیر اولیه‌ی سند از روی پرونده */
export function autofillValues(template: FormTemplate, client?: Client): Record<string, string> {
  const values: Record<string, string> = {};
  template.fields.forEach((field) => {
    if (field.defaultValue) values[field.key] = field.defaultValue;
    if (field.source) {
      const value = clientSourceValue(client, field.source);
      if (value) values[field.key] = value;
    }
  });
  return values;
}

/** فیلدهایی که از پرونده پر شده‌اند */
export function autofilledKeys(template: FormTemplate): string[] {
  return template.fields.filter((field) => Boolean(field.source)).map((field) => field.key);
}

/** جستجوی متنی ساده در مقادیر (برای فهرست اسناد) */
export function searchableValues(values: Record<string, string>): string {
  return normalizeText(Object.values(values).join(' '));
}
