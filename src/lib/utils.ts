/* ابزارهای عمومی: ادغام کلاس، شناسه، نرمال‌سازی متن فارسی، دانلود فایل */

export type ClassValue = string | number | bigint | boolean | null | undefined;

/** ادغام سبک کلاس‌های Tailwind */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}

/** شناسه یکتا — بدون وابستگی خارجی */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** ارقام فارسی/عربی → لاتین */
export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p > -1) return String(p);
    const a = ARABIC_DIGITS.indexOf(ch);
    return a > -1 ? String(a) : ch;
  });
}

/** ارقام لاتین → فارسی */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** فقط رقم‌ها را نگه می‌دارد (برای ذخیره‌ی امن ورودی‌های عددی) */
export function onlyDigits(input: string): string {
  return toLatinDigits(input).replace(/[^\d]/g, '');
}

/**
 * نرمال‌سازی متن برای جستجو: یکسان‌سازی ی/ک، حذف اعراب، تبدیل ارقام،
 * جمع‌کردن فاصله‌های اضافه. تا «ميرزا» و «میرزا» یکسان پیدا شوند.
 */
export function normalizeText(input: string): string {
  return toLatinDigits(String(input ?? ''))
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/[\u0643]/g, 'ک')
    .replace(/[\u0623\u0625\u0622\u0627]/g, 'ا')
    .replace(/[\u0629]/g, 'ه')
    .replace(/[\u064B-\u0652\u0640\u200C\u200F\u200E]/g, '')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** مقایسه‌ی متن فارسی برای مرتب‌سازی */
export function compareText(a: string, b: string): number {
  return String(a ?? '').localeCompare(String(b ?? ''), 'fa');
}

/** مقایسه‌ی اعداد با پشتیبانی از ارقام فارسی */
export function compareNumber(a: number, b: number): number {
  return (a || 0) - (b || 0);
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** دانلود یک فایل تولیدشده در مرورگر */
export function downloadFile(filename: string, content: string | Blob, mime = 'text/plain;charset=utf-8') {
  const blob = typeof content === 'string' ? new Blob([`\uFEFF${content}`], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** متر و واحدها */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** گروه‌بندی آرایه بر اساس کلید */
export function groupCount<T>(items: T[], keyOf: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyOf(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

/** فشرده‌سازی تصویر اسکن‌شده پیش از ذخیره (کاهش حجم برای اجرا روی سیستم‌های ضعیف) */
export async function compressImage(file: File, maxSide = 1400, quality = 0.72): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
