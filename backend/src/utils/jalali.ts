
import { toLatinDigits } from './validation.js';

const PERSIAN_CALENDAR = 'fa-IR-u-ca-persian';
const NUMERIC_CALENDAR = 'en-US-u-ca-persian';

const yearFormatter = new Intl.DateTimeFormat(NUMERIC_CALENDAR, { year: 'numeric' });
const monthKeyFormatter = new Intl.DateTimeFormat(NUMERIC_CALENDAR, { year: 'numeric', month: '2-digit' });
const monthLabelFormatter = new Intl.DateTimeFormat(PERSIAN_CALENDAR, { year: 'numeric', month: 'long' });

/** Current Jalali year as a latin-digit string, e.g. "1405". */
export function jalaliYear(date: Date = new Date()): string {
  return yearFormatter.format(date).replace(/\D/g, '');
}

/** Jalali month key such as "1405-07" — used for monthly report buckets. */
export function jalaliMonthKey(date: Date): string {
  const parts = monthKeyFormatter.formatToParts(date);
  const year = (parts.find((part) => part.type === 'year')?.value ?? '').replace(/\D/g, '');
  const month = (parts.find((part) => part.type === 'month')?.value ?? '').replace(/\D/g, '').padStart(2, '0');
  return `${year}-${month}`;
}

export function jalaliMonthLabel(date: Date): string {
  return monthLabelFormatter.format(date);
}

export interface JalaliMonthBucket {
  key: string;
  label: string;
}

interface JalaliDateParts {
  year: number;
  month: number;
  day: number;
}

const numericCalendarUtc = new Intl.DateTimeFormat(NUMERIC_CALENDAR, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function jalaliPartsUtc(date: Date): JalaliDateParts {
  if (numericCalendarUtc.resolvedOptions().calendar !== 'persian') {
    throw new Error('The runtime does not support the Persian calendar.');
  }
  const parts = numericCalendarUtc.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value.replace(/\D/g, '') ?? NaN);
  return { year: read('year'), month: read('month'), day: read('day') };
}

function jalaliNewYearUtc(year: number): Date | null {
  const start = Date.UTC(year + 621, 2, 17);
  for (let offset = 0; offset < 12; offset += 1) {
    const candidate = new Date(start + offset * 86_400_000);
    const parts = jalaliPartsUtc(candidate);
    if (parts.year === year && parts.month === 1 && parts.day === 1) return candidate;
  }
  return null;
}

export function normalizeJalaliDate(value: string): string | null {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(toLatinDigits(value.trim()));
  if (!match) return null;
  const requested = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (
    requested.year < 1 ||
    requested.year > 3000 ||
    requested.month < 1 ||
    requested.month > 12 ||
    requested.day < 1
  ) return null;

  const newYear = jalaliNewYearUtc(requested.year);
  if (!newYear) return null;
  const dayOfYear =
    (requested.month <= 6 ? (requested.month - 1) * 31 : 186 + (requested.month - 7) * 30) +
    requested.day -
    1;
  const actual = jalaliPartsUtc(new Date(newYear.getTime() + dayOfYear * 86_400_000));
  if (actual.year !== requested.year || actual.month !== requested.month || actual.day !== requested.day) return null;
  return `${requested.year}/${String(requested.month).padStart(2, '0')}/${String(requested.day).padStart(2, '0')}`;
}

export function jalaliToGregorianIso(value: string): string | null {
  const normalized = normalizeJalaliDate(value);
  if (!normalized) return null;
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(normalized);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const newYear = jalaliNewYearUtc(year);
  if (!newYear) return null;
  const dayOfYear = (month <= 6 ? (month - 1) * 31 : 186 + (month - 7) * 30) + day - 1;
  return new Date(newYear.getTime() + dayOfYear * 86_400_000).toISOString().slice(0, 10);
}

export function gregorianToJalali(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return null;
  const parts = numericCalendarUtc.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value.replace(/\D/g, '') ?? NaN);
  const jalali = { year: read('year'), month: read('month'), day: read('day') };
  return `${jalali.year}/${String(jalali.month).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`;
}

export function normalizeLegacyJalaliDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = normalizeJalaliDate(value);
  if (normalized) return normalized;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  if (Number(match[1]) >= 1800) return gregorianToJalali(value) ?? undefined;
  return normalizeJalaliDate(value.replaceAll('-', '/')) ?? undefined;
}

/**
 * Distinct Jalali months covering `count` months, oldest first, ending today.
 * Walking backwards day by day keeps month boundaries correct without a
 * calendar dependency and is bounded to roughly 12 months of iterations.
 */
export function lastJalaliMonths(count: number): JalaliMonthBucket[] {
  const buckets = new Map<string, string>();
  const cursor = new Date();
  const limit = count * 35;

  for (let index = 0; index < limit && buckets.size < count; index += 1) {
    const key = jalaliMonthKey(cursor);
    if (!buckets.has(key)) buckets.set(key, jalaliMonthLabel(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  return Array.from(buckets.entries())
    .map(([key, label]) => ({ key, label }))
    .reverse();
}

/** Turn per-day counts into per-Jalali-month totals for a fixed list of buckets. */
export function aggregateByJalaliMonth(
  daily: Array<{ day: string; count: number }>,
  buckets: JalaliMonthBucket[],
): number[] {
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));
  for (const row of daily) {
    const key = jalaliMonthKey(new Date(`${row.day}T00:00:00Z`));
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + Number(row.count));
  }
  return buckets.map((bucket) => totals.get(bucket.key) ?? 0);
}
