/* ابزارهای کاربری — تولید رمز پیشنهادی و اعتبارسنجی کد ملی/موبایل.
   هش رمز عبور فقط سمت بک‌اند (bcrypt) انجام می‌شود؛ کلاینت هیچ رمزی را
   هش یا بررسی نمی‌کند. */

import { toLatinDigits } from './utils';

const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** تولید رمز پیشنهادی برای کاربر جدید */
export function suggestPassword(length = 10): string {
  let out = '';
  const bytes = new Uint32Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 1_000_000);
  }
  for (let i = 0; i < length; i += 1) {
    out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return out;
}

/** اعتبارسنجی کد ملی ایران (۱۰ رقم با رقم کنترل) */
export function isValidNationalId(value: string): boolean {
  const code = value.replace(/\D/g, '');
  if (code.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(code[i]) * (10 - i);
  const remainder = sum % 11;
  const check = Number(code[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/** اعتبارسنجی موبایل ایران */
export function isValidMobile(value: string): boolean {
  return /^09\d{9}$/.test(toLatinDigits(value));
}

export function isAlphabeticName(value: string): boolean {
  return /^[\p{L}\p{M}\s\u200c]+$/u.test(value.trim());
}
