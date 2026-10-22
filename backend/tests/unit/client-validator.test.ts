import { describe, expect, it } from 'vitest';
import { createClientSchema, updateClientSchema } from '../../src/validators/client.validator.js';

describe('identity-only client schema', () => {
  it('accepts identity details and applies operational defaults', () => {
    const parsed = createClientSchema.parse({
      fullName: 'علی رضایی',
      nationalId: '0123456789',
      mobile: '09123456789',
      fatherName: 'حسن',
      birthDate: '۱۳۷۰/۰۱/۰۱',
      phone: '02112345678',
      residenceAddress: 'تهران',
    });

    expect(parsed).toMatchObject({
      fullName: 'علی رضایی',
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

  it('rejects removed counterparty and property fields in create and update requests', () => {
    expect(createClientSchema.safeParse({ fullName: 'علی رضایی', party2Name: 'نام حذف‌شده' }).success).toBe(false);
    expect(updateClientSchema.safeParse({ residenceAddress: 'تهران', propertyKind: 'apartment' }).success).toBe(false);
  });
});
