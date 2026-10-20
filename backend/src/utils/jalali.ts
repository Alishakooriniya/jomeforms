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
