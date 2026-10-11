/* هش رمز عبور — سبک و بدون وابستگی.
   ⚠️ فقط برای دموی سمت کلاینت: این الگوریتم امنیتی نیست.
   در بک‌اند واقعی از bcrypt/argon2 استفاده شود (docs/database-schema.sql). */

const SALT = 'estate-crm::v1';

function fnv1a(text: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function hashPassword(raw: string): string {
  const base = `${SALT}|${raw}|${raw.length}`;
  const a = fnv1a(base, 0x811c9dc5);
  const b = fnv1a(`${base}::${a}`, 0x1000193);
  const c = fnv1a(`${a.toString(16)}${base}`, 0x9e3779b9);
  return `${a.toString(16)}${b.toString(16)}${c.toString(16)}`;
}

export function verifyPassword(raw: string, hash: string): boolean {
  return hashPassword(raw) === hash;
}

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
  const digits = value.replace(/\D/g, '');
  return /^09\d{9}$/.test(digits);
}
