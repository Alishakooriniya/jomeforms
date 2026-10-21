import type { Client, TemplateField } from '../types/domain.js';

/** Client fields a template field can be prefilled from (mirrors `CLIENT_SOURCES`). */
export const CLIENT_SOURCE_KEYS = [
  'code',
  'fullName',
  'nationalId',
  'mobile',
  'phone',
  'fatherName',
  'birthDate',
  'address',
] as const;

function sourceValue(client: Client, source: string): string {
  if (!(CLIENT_SOURCE_KEYS as readonly string[]).includes(source)) return '';
  if (source === 'address') return client.residenceAddress ?? '';
  const raw = (client as unknown as Record<string, unknown>)[source];
  if (raw === undefined || raw === null) return '';
  return String(raw);
}

/**
 * Build initial document values: template defaults first, then values sourced
 * from the linked case file (same precedence as the frontend's `autofillValues`).
 */
export function autofillValues(fields: TemplateField[], client?: Client): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (field.defaultValue) values[field.key] = field.defaultValue;
    if (field.source && client) {
      const value = sourceValue(client, field.source);
      if (value) values[field.key] = value;
    }
  }
  return values;
}

/**
 * Required fields that have no value yet. Used when a document is created or
 * its values are replaced, so the server enforces the same rule as the UI.
 */
export function missingRequiredFields(
  fields: TemplateField[],
  values: Record<string, string>,
): TemplateField[] {
  return fields.filter((field) => field.required && !(values[field.key] ?? '').trim());
}

/** Only keys declared by the template are accepted as submitted values. */
export function pickTemplateValues(
  fields: TemplateField[],
  values: Record<string, string>,
): Record<string, string> {
  const allowed = new Set(fields.map((field) => field.key));
  return Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
}
