import { describe, expect, it } from 'vitest';
import { templateFieldSchema } from '../../src/validators/template.validator.js';

const field = {
  id: 'field-1',
  key: 'payment_method',
  label: 'روش پرداخت',
  type: 'select',
  required: false,
};

describe('template field validation', () => {
  it('requires at least one choice for selection fields', () => {
    expect(templateFieldSchema.safeParse(field).success).toBe(false);
    expect(templateFieldSchema.safeParse({ ...field, options: [''] }).success).toBe(false);
    expect(templateFieldSchema.safeParse({ ...field, options: ['نقدی', 'اقساطی'] }).success).toBe(true);
  });

  it('does not require choices for other field types', () => {
    expect(templateFieldSchema.safeParse({ ...field, type: 'text' }).success).toBe(true);
  });
});
