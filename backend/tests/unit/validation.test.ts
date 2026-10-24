import { describe, expect, it } from 'vitest';
import {
  isAlphabeticName,
  isValidBirthCertificateNumber,
  isValidMobile,
  isValidNationalId,
} from '../../src/utils/validation.js';

describe('Iranian identifier validation', () => {
  it('accepts a national ID with a valid checksum', () => {
    expect(isValidNationalId('0123456789')).toBe(true);
  });

  it('rejects a national ID with a bad checksum or repeated digits', () => {
    expect(isValidNationalId('0123456788')).toBe(false);
    expect(isValidNationalId('1111111111')).toBe(false);
    expect(isValidNationalId('123')).toBe(false);
  });

  it('accepts 09 mobile numbers only', () => {
    expect(isValidMobile('09123456789')).toBe(true);
    expect(isValidMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(isValidMobile('02123456789')).toBe(false);
    expect(isValidMobile('0912345678')).toBe(false);
    expect(isValidMobile('09123-456789')).toBe(false);
  });

  it('accepts names containing letters, spaces, and Persian joiners only', () => {
    expect(isAlphabeticName('علی رضایی')).toBe(true);
    expect(isAlphabeticName('علی‌رضایی')).toBe(true);
    expect(isAlphabeticName('علی 2')).toBe(false);
    expect(isAlphabeticName('نام1')).toBe(false);
  });

  it('limits birth certificate numbers to at most 10 digits', () => {
    expect(isValidBirthCertificateNumber('۱۲۳۴۵۶۷۸۹۰')).toBe(true);
    expect(isValidBirthCertificateNumber('12345678901')).toBe(false);
    expect(isValidBirthCertificateNumber('12345a')).toBe(false);
  });
});
