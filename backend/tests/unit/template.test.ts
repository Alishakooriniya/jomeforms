import { describe, expect, it } from 'vitest';
import type { TemplateField } from '../../src/types/domain.js';
import {
  autofillValues,
  missingRequiredFields,
  pickTemplateValues,
} from '../../src/utils/template.js';

const fields: TemplateField[] = [
  { id: 'f1', key: 'buyer_name', label: 'خریدار', type: 'text', required: true },
  { id: 'f2', key: 'price', label: 'قیمت', type: 'currency', required: false },
  {
    id: 'f3',
    key: 'address',
    label: 'نشانی',
    type: 'text',
    required: false,
    source: 'address',
    defaultValue: 'نامشخص',
  },
];

describe('template value helpers', () => {
  it('keeps only keys declared by the template', () => {
    const picked = pickTemplateValues(fields, { buyer_name: 'علی', injected: 'x' });
    expect(picked).toEqual({ buyer_name: 'علی' });
  });

  it('prefills defaults and linked case fields', () => {
    const values = autofillValues(fields, {
      id: 'c1',
      code: 'پ-1405-0001',
      fullName: 'علی رضایی',
      nationalId: '',
      mobile: '',
      caseType: 'document_request',
      workflow: [],
      partyRole: 'buyer',
      dealKind: 'sale',
      status: 'new',
      province: '',
      city: '',
      address: 'تهران',
      propertyKind: 'apartment',
      area: 0,
      price: 0,
      deposit: 0,
      rent: 0,
      commissionPercent: 0,
      tags: [],
      extra: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    });
    expect(values).toEqual({ address: 'تهران' });
  });

  it('reports required fields without a value', () => {
    expect(missingRequiredFields(fields, {})).toEqual([fields[0]]);
    expect(missingRequiredFields(fields, { buyer_name: '  ' })).toEqual([fields[0]]);
    expect(missingRequiredFields(fields, { buyer_name: 'علی' })).toEqual([]);
  });
});
