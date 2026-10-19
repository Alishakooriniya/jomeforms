/* گزینه‌های پوسته — یک منبع حقیقت برای منوی سرصفحه، تنظیمات و
   اعتبارسنجی مقدارهای ذخیره‌شده.

   پالت سامانه «سبز روی خاکستری» است:
   • همه سطوح (پس‌زمینه، کارت، خطوط، متن) خاکستریِ کاملاً خنثی‌اند؛
   • رنگ سازمانی فقط از خانواده سبز انتخاب می‌شود. */

import type { ThemeAccent, ThemeMode, ThemeRadius } from '../types';
import type { IconName } from '../components/ui/Icon';

export interface ThemeOption<T> {
  value: T;
  label: string;
}

export const THEME_MODES: Array<ThemeOption<ThemeMode> & { icon: IconName }> = [
  { value: 'light', label: 'روشن', icon: 'sun' },
  { value: 'dark', label: 'تاریک', icon: 'moon' },
  { value: 'system', label: 'سیستم', icon: 'monitor' },
];

export const THEME_ACCENTS: Array<ThemeOption<ThemeAccent> & { hint: string; color: string }> = [
  { value: 'green', label: 'سبز (پیش‌فرض)', hint: 'سبز جومه', color: '#176b43' },
  { value: 'emerald', label: 'زمردی', hint: 'سبز روشن و پرشور', color: '#10b981' },
  { value: 'mint', label: 'نعنایی', hint: 'سبز خنک و آرام', color: '#22a892' },
  { value: 'forest', label: 'جنگلی', hint: 'سبز تیره و کم‌جوان', color: '#527a56' },
];

export const THEME_RADII: Array<ThemeOption<ThemeRadius>> = [
  { value: 'sm', label: 'کم' },
  { value: 'md', label: 'متوسط' },
  { value: 'lg', label: 'زیاد' },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.some((mode) => mode.value === value);
}

export function isThemeAccent(value: unknown): value is ThemeAccent {
  return typeof value === 'string' && THEME_ACCENTS.some((accent) => accent.value === value);
}

export function isThemeRadius(value: unknown): value is ThemeRadius {
  return typeof value === 'string' && THEME_RADII.some((radius) => radius.value === value);
}
