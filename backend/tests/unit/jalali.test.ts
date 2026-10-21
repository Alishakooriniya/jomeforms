import { describe, expect, it } from 'vitest';
import { dateSchema } from '../../src/validators/common.validator.js';
import { templateFieldSchema } from '../../src/validators/template.validator.js';
import { gregorianToJalali, jalaliToGregorianIso, normalizeJalaliDate } from '../../src/utils/jalali.js';

describe('Jalali date validation and conversion', () => {
  it('normalizes Persian digits and converts a Jalali day to Gregorian for timestamp queries', () => {
    expect(normalizeJalaliDate('۱۴۰۳/۰۱/۰۱')).toBe('1403/01/01');
    expect(jalaliToGregorianIso('1403/01/01')).toBe('2024-03-20');
    expect(gregorianToJalali('2024-03-20')).toBe('1403/01/01');
    expect(dateSchema.parse('۱۴۰۳/۱/۱')).toBe('1403/01/01');
  });

  it('rejects Gregorian-formatted dates, invalid Jalali days, and Persian leap-day overflow', () => {
    expect(dateSchema.safeParse('2024-03-20').success).toBe(false);
    expect(dateSchema.safeParse('1403/13/01').success).toBe(false);
    expect(dateSchema.safeParse('1404/12/30').success).toBe(false);
  });

  it('validates and canonicalizes date defaults in template definitions', () => {
    const field = {
      id: 'date-field',
      key: 'document_date',
      label: 'تاریخ سند',
      type: 'date',
      required: false,
      defaultValue: '۱۴۰۳/۱/۱',
    };
    expect(templateFieldSchema.parse(field).defaultValue).toBe('1403/01/01');
    expect(templateFieldSchema.safeParse({ ...field, defaultValue: '2024-03-20' }).success).toBe(false);
  });
});
