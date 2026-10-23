import { describe, expect, it } from 'vitest';
import { createClientSchema, updateClientSchema } from '../../src/validators/client.validator.js';

describe('identity-only client schema', () => {
  it('accepts identity details and applies operational defaults', () => {
    const parsed = createClientSchema.parse({
      fullName: 'علی رضایی',
      nationalId: '0123456789',
      mobile: '09123456789',
      birthCertificateNumber: '۱۲۳۴۵۶',
      fatherName: 'حسن',
      issuePlace: 'تهران',
      birthDate: '۱۳۷۰/۰۱/۰۱',
      residenceAddress: 'تهران',
    });

    expect(parsed).toMatchObject({
      fullName: 'علی رضایی',
      birthCertificateNumber: '۱۲۳۴۵۶',
      fatherName: 'حسن',
      issuePlace: 'تهران',
      caseType: 'document_request',
      status: 'new',
      birthDate: '1370/01/01',
      residenceAddress: 'تهران',
    });
  });

  it('rejects Gregorian-formatted birth dates', () => {
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', birthDate: '1991-01-01' }).success).toBe(false);
    expect(createClientSchema.parse({ fullName: 'علی رضایی', birthDate: '' }).birthDate).toBeNull();
  });

  it('validates mobile numbers, names, and birth certificate numbers', () => {
    expect(createClientSchema.safeParse({ fullName: 'علی 2' }).success).toBe(false);
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', fatherName: 'حسن2' }).success).toBe(false);
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', issuePlace: 'تهران1' }).success).toBe(false);
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', mobile: '0912345678' }).success).toBe(false);
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', mobile: '۰۹۱۲۳۴۵۶۷۸۹' }).success).toBe(true);
    expect(
      createClientSchema.safeParse({ fullName: 'علی رضایی', birthCertificateNumber: '12345678901' }).success,
    ).toBe(false);
  });

  it('rejects removed counterparty and property fields in create and update requests', () => {
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', phone: '02112345678' }).success).toBe(false);
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', party2Name: 'نام حذف‌شده' }).success).toBe(false);
    expect(updateClientSchema.safeParse({ residenceAddress: 'تهران', propertyKind: 'apartment' }).success).toBe(false);
    expect(updateClientSchema.safeParse({ phone: '02112345678' }).success).toBe(false);
  });
});
