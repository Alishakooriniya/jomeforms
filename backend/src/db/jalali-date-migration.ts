import type { DbClient } from '../config/database.js';
import { normalizeJalaliDate, normalizeLegacyJalaliDate } from '../utils/jalali.js';

interface ClientDateRow {
  id: string;
  birth_date: string | null;
}

interface DocumentDateRow {
  id: string;
  values: Record<string, unknown>;
  fields: Array<{ key: string; type: string }>;
}

export async function migrateStoredDatesToJalali(client: DbClient): Promise<void> {
  const clients = await client.query<ClientDateRow>(
    'select id, birth_date from clients where birth_date is not null and birth_date <> \'\'',
  );
  for (const row of clients.rows) {
    const date = normalizeLegacyJalaliDate(row.birth_date);
    if (!date) throw new Error(`Cannot migrate client birth date for record ${row.id} to Jalali format.`);
    if (date !== row.birth_date) {
      await client.query('update clients set birth_date = $1 where id = $2', [date, row.id]);
    }
  }

  const documents = await client.query<DocumentDateRow>(`
    select d.id, d.values,
           coalesce(v.fields, t.fields, '[]'::jsonb) as fields
    from documents d
    left join form_template_versions v
      on v.template_id = d.template_id and v.version = d.template_version
    left join form_templates t on t.id = d.template_id
  `);

  for (const row of documents.rows) {
    const values = { ...row.values };
    let changed = false;
    for (const field of row.fields) {
      const raw = values[field.key];
      if (field.type !== 'date' || typeof raw !== 'string' || !raw) continue;
      const current = raw;
      const date = normalizeLegacyJalaliDate(current);
      if (!date) throw new Error(`Cannot migrate document date ${field.key} for record ${row.id} to Jalali format.`);
      if (date !== current) {
        values[field.key] = date;
        changed = true;
      } else if (!normalizeJalaliDate(current)) {
        throw new Error(`Document date ${field.key} for record ${row.id} is not a valid Jalali date.`);
      }
    }
    if (changed) {
      await client.query('update documents set values = $1::jsonb where id = $2', [JSON.stringify(values), row.id]);
    }
  }
}
