/* گزینه‌های پوسته — فقط دو حالت روشن/تاریک؛ منبع حقیقت برای
   صفحه تنظیمات و اعتبارسنجی مقدار ذخیره‌شده. */

import type { ThemeMode } from '../types';
import type { IconName } from '../components/ui/Icon';

export interface ThemeOption<T> {
  value: T;
  label: string;
}

export const THEME_MODES: Array<ThemeOption<ThemeMode> & { icon: IconName }> = [
  { value: 'light', label: 'روشن', icon: 'sun' },
  { value: 'dark', label: 'تاریک', icon: 'moon' },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.some((mode) => mode.value === value);
}
