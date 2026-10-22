import { toLatinDigits } from './utils';

export interface JalaliDateParts {
  year: number;
  month: number;
  day: number;
}

const persianCalendarUtc = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

const persianCalendarLocal = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function ensurePersianCalendarSupport(formatter: Intl.DateTimeFormat): void {
  if (formatter.resolvedOptions().calendar !== 'persian') {
    throw new Error('این مرورگر از تقویم شمسی پشتیبانی نمی‌کند.');
  }
}

function partsFromFormatter(date: Date, formatter: Intl.DateTimeFormat): JalaliDateParts {
  ensurePersianCalendarSupport(formatter);
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value.replace(/\D/g, '') ?? NaN);
  return { year: read('year'), month: read('month'), day: read('day') };
}

export function jalaliPartsFromDate(date: Date): JalaliDateParts {
  return partsFromFormatter(date, persianCalendarLocal);
}

function jalaliNewYearUtc(year: number): Date | null {
  const start = Date.UTC(year + 621, 2, 17);
  for (let offset = 0; offset < 12; offset += 1) {
    const candidate = new Date(start + offset * 86_400_000);
    const parts = partsFromFormatter(candidate, persianCalendarUtc);
    if (parts.year === year && parts.month === 1 && parts.day === 1) return candidate;
  }
  return null;
}

export function parseJalaliDate(value: string): JalaliDateParts | null {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(toLatinDigits(value.trim()));
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidJalaliParts(parts) ? parts : null;
}

export function isValidJalaliDate(value: string): boolean {
  return parseJalaliDate(value) !== null;
}

function isValidJalaliParts(parts: JalaliDateParts): boolean {
  if (parts.year < 1 || parts.year > 3000 || parts.month < 1 || parts.month > 12 || parts.day < 1) return false;
  const newYear = jalaliNewYearUtc(parts.year);
  if (!newYear) return false;
  const dayOfYear = (parts.month <= 6 ? (parts.month - 1) * 31 : 186 + (parts.month - 7) * 30) + parts.day - 1;
  const candidate = new Date(newYear.getTime() + dayOfYear * 86_400_000);
  const actual = partsFromFormatter(candidate, persianCalendarUtc);
  return actual.year === parts.year && actual.month === parts.month && actual.day === parts.day;
}

export function normalizeJalaliDate(value: string): string | null {
  const parts = parseJalaliDate(value);
  if (!parts) return null;
  return `${parts.year}/${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}`;
}

export function jalaliMonthLength(year: number, month: number): number {
  for (let day = 31; day >= 29; day -= 1) {
    if (normalizeJalaliDate(`${year}/${month}/${day}`)) return day;
  }
  return 0;
}

export function jalaliToGregorianIso(value: string): string | null {
  const parts = parseJalaliDate(value);
  if (!parts) return null;
  const newYear = jalaliNewYearUtc(parts.year);
  if (!newYear) return null;
  const dayOfYear = (parts.month <= 6 ? (parts.month - 1) * 31 : 186 + (parts.month - 7) * 30) + parts.day - 1;
  return new Date(newYear.getTime() + dayOfYear * 86_400_000).toISOString().slice(0, 10);
}

export function jalaliToLocalDate(value: string): Date | null {
  const isoDate = jalaliToGregorianIso(value);
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
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
  const parts = partsFromFormatter(date, persianCalendarUtc);
  return `${parts.year}/${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}`;
}

export function jalaliDateFromDate(date: Date): string {
  const parts = jalaliPartsFromDate(date);
  return `${parts.year}/${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}`;
}

export function normalizeLegacyJalaliDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = normalizeJalaliDate(value);
  if (normalized) return normalized;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  if (Number(match[1]) >= 1800) return gregorianToJalali(value) ?? undefined;
  return normalizeJalaliDate(value.replaceAll('-', '/')) ?? undefined;
}
