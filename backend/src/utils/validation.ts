/** Convert Persian/Arabic digits to ASCII so IDs typed in the UI validate. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/** Iranian national ID check (10 digits, control digit) — mirrors the frontend. */
export function isValidNationalId(value: string): boolean {
  const code = toLatinDigits(value).replace(/\D/g, '');
  if (code.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(code[index]) * (10 - index);
  }
  const remainder = sum % 11;
  const check = Number(code[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/** Iranian mobile number check — 11 digits starting with 09. */
export function isValidMobile(value: string): boolean {
  return /^09\d{9}$/.test(toLatinDigits(value));
}

export function isAlphabeticName(value: string): boolean {
  return /^[\p{L}\p{M}\s\u200c]+$/u.test(value.trim());
}

export function isValidBirthCertificateNumber(value: string): boolean {
  const number = toLatinDigits(value.trim());
  return /^\d{1,10}$/.test(number);
}

export function onlyDigits(value: string | undefined | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] ?? digit);
}
