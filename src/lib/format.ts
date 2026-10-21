/* قالب‌بندی نمایش: تاریخ شمسی، مبلغ، عدد، حجم فایل.
   برای تاریخ شمسی از Intl خود مرورگر استفاده می‌کنیم (بدون کتابخانه). */

import { toLatinDigits, toPersianDigits } from './utils';
import { jalaliDateFromDate, jalaliToLocalDate } from './jalali';

const PERSIAN_CALENDAR = 'fa-IR-u-ca-persian';

const SUPPORTS_PERSIAN_CALENDAR = (() => {
  try {
    return new Intl.DateTimeFormat(PERSIAN_CALENDAR, { year: 'numeric' }).resolvedOptions().calendar === 'persian';
  } catch {
    return false;
  }
})();

/* ------------------------- تنظیم ارقام نمایشی ------------------------- */
let persianDigits = true;

export function setDigitPreference(value: boolean) {
  persianDigits = value;
}

export function usePersianDigits(): boolean {
  return persianDigits;
}

/** تبدیل ارقام متناسب با تنظیمات کاربر */
export function displayDigits(text: string | number): string {
  const value = typeof text === 'number' ? String(text) : text;
  return persianDigits ? toPersianDigits(value) : value;
}

/** جداکننده هزارگان فارسی */
function withSeparator(text: string): string {
  return persianDigits ? toPersianDigits(text).replace(/,/g, '٬') : text;
}

/** نمایش شناسه‌ها و شماره‌ها (شماره پرونده، شماره سند) */
export function formatCode(value?: string | null): string {
  if (!value) return '—';
  return displayDigits(value);
}

/* ------------------------------- اعداد ------------------------------- */

export function formatNumber(value: number | string, fractionDigits = 0): string {
  const num = typeof value === 'number' ? value : Number(toLatinDigits(String(value)) || 0);
  if (!Number.isFinite(num)) return displayDigits('0');
  const text = num.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return withSeparator(text);
}

/** مبلغ کامل: ۱۲٬۵۰۰٬۰۰۰ تومان */
export function formatMoney(value: number | undefined | null, suffix = 'تومان'): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  if (!value) return displayDigits(`0 ${suffix}`);
  return `${formatNumber(value)} ${suffix}`;
}

/** مبلغ خلاصه: ۱۲٫۵ میلیارد تومان — مناسب جدول و کارت */
export function formatMoneyShort(value: number | undefined | null, withUnit = true): string {
  if (value === undefined || value === null || Number.isNaN(value) || !value) return '—';
  const abs = Math.abs(value);
  const units: Array<[number, string]> = [
    [1_000_000_000_000, 'هزار میلیارد'],
    [1_000_000_000, 'میلیارد'],
    [1_000_000, 'میلیون'],
    [1_000, 'هزار'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const scaled = value / size;
      const text = scaled.toLocaleString('en-US', { maximumFractionDigits: scaled < 10 ? 1 : 0 });
      return withSeparator(text) + (withUnit ? ` ${label} تومان` : ` ${label}`);
    }
  }
  return withSeparator(String(Math.round(value)));
}

export function formatArea(value: number | undefined | null): string {
  if (!value) return '—';
  return `${formatNumber(value)} متر`;
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return displayDigits(`${value}٪`);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return displayDigits('0');
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** index;
  return displayDigits(`${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`);
}

/* -------------------------------- تاریخ ------------------------------- */

function parseDateValue(value?: string | Date): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value.includes('/')) return jalaliToLocalDate(value);
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoDay) {
    const year = Number(isoDay[1]);
    if (year >= 1200 && year <= 1600) return jalaliToLocalDate(value.replaceAll('-', '/'));
    return new Date(year, Number(isoDay[2]) - 1, Number(isoDay[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  if (!SUPPORTS_PERSIAN_CALENDAR) throw new Error('این مرورگر از تقویم شمسی پشتیبانی نمی‌کند.');
  const key = JSON.stringify(options);
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat(PERSIAN_CALENDAR, options);
  formatterCache.set(key, created);
  return created;
}

export type DateStyle = 'short' | 'long' | 'numeric' | 'datetime' | 'time';

/** تاریخ شمسی خوانا */
export function formatDate(value?: string | Date, style: DateStyle = 'short'): string {
  const date = parseDateValue(value);
  if (!date) return '—';
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { year: '2-digit', month: '2-digit', day: '2-digit' }
      : style === 'numeric'
        ? { year: 'numeric', month: '2-digit', day: '2-digit' }
        : style === 'long'
          ? { year: 'numeric', month: 'long', day: 'numeric' }
          : style === 'time'
            ? { hour: '2-digit', minute: '2-digit' }
            : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const text = formatter(options).format(date);
  return persianDigits ? text : toLatinDigits(text);
}

/** فاصله‌ی زمانی نسبی: «۳ دقیقه پیش» */
export function formatRelative(value?: string | Date): string {
  const date = parseDateValue(value);
  if (!date) return '—';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'لحظه‌ای پیش';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return displayDigits(`${minutes} دقیقه پیش`);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return displayDigits(`${hours} ساعت پیش`);
  const days = Math.round(hours / 24);
  if (days === 1) return 'دیروز';
  if (days < 30) return displayDigits(`${days} روز پیش`);
  return formatDate(value);
}

/** مقدار تاریخ امروز با قالب شمسی YYYY/MM/DD */
export function todayInputValue(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return jalaliDateFromDate(now);
}

/** الان به شکل ISO (برای زمان‌های رکورد) */
export function nowISO(): string {
  return new Date().toISOString();
}

/** برچسب شمسی برای input نوع تاریخ */
export function dateInputHint(value?: string): string {
  return value ? formatDate(value, 'long') : 'تاریخ شمسی';
}

/** سال شمسی جاری (برای شماره‌گذاری اسناد) */
export function jalaliYear(): string {
  const parts = jalaliDateFromDate(new Date()).split('/');
  return parts[0] ?? '';
}

/* -------------------- گروه‌بندی ماهانه (برای گزارش‌ها) -------------------- */

function jalaliParts(value: string | Date): { year: string; month: string; day: string } {
  const date = typeof value === 'string' ? (parseDateValue(value) ?? new Date()) : value;
  const parts = formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const read = (type: string) =>
    toLatinDigits(parts.find((part) => part.type === type)?.value ?? '').replace(/\D/g, '');
  return { year: read('year'), month: read('month'), day: read('day') };
}

/** کلید ماه شمسی مثل `1405-07` برای گروه‌بندی داده‌ها */
export function jalaliMonthKey(value: string | Date): string {
  const { year, month } = jalaliParts(value);
  return `${year}-${month}`;
}

/** برچسب ماه شمسی مثل «مهر ۱۴۰۵» */
export function jalaliMonthLabel(value: string | Date): string {
  const date = typeof value === 'string' ? (parseDateValue(value) ?? new Date()) : value;
  const text = formatter({ year: 'numeric', month: 'long' }).format(date);
  return persianDigits ? text : toLatinDigits(text);
}

/** فهرست N ماه اخیر (برای نمودارها) */
export function lastJalaliMonths(count: number): Array<{ key: string; label: string; date: Date }> {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), 15);
  const months: Array<{ key: string; label: string; date: Date }> = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(base.getFullYear(), base.getMonth() - index, 15);
    months.push({ key: jalaliMonthKey(date), label: jalaliMonthLabel(date), date });
  }
  return months;
}

/** شماره‌گذاری ترتیبی: ۱۴۰۵-۰۰۰۷ */
export function sequenceNumber(prefix: string, sequence: number, pad = 4): string {
  return `${prefix}${jalaliYear()}-${String(sequence).padStart(pad, '0')}`;
}
