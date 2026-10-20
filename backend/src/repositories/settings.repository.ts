import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { AppSettings } from '../types/domain.js';

interface SettingsRow extends QueryResultRow {
  org_name: string;
  org_legal_name: string;
  org_phone: string;
  org_address: string;
  default_province: string;
  default_city: string;
  doc_prefix: string;
  client_prefix: string;
  show_persian_digits: boolean;
  default_page_size: number;
  contract_note: string;
}

function mapSettings(row: SettingsRow): AppSettings {
  return {
    orgName: row.org_name,
    orgLegalName: row.org_legal_name,
    orgPhone: row.org_phone,
    orgAddress: row.org_address,
    defaultProvince: row.default_province,
    defaultCity: row.default_city,
    docPrefix: row.doc_prefix,
    clientPrefix: row.client_prefix,
    showPersianDigits: row.show_persian_digits,
    defaultPageSize: row.default_page_size,
    contractNote: row.contract_note,
  };
}

const COLUMNS: Record<keyof AppSettings, string> = {
  orgName: 'org_name',
  orgLegalName: 'org_legal_name',
  orgPhone: 'org_phone',
  orgAddress: 'org_address',
  defaultProvince: 'default_province',
  defaultCity: 'default_city',
  docPrefix: 'doc_prefix',
  clientPrefix: 'client_prefix',
  showPersianDigits: 'show_persian_digits',
  defaultPageSize: 'default_page_size',
  contractNote: 'contract_note',
};

export class SettingsRepository {
  async get(): Promise<AppSettings> {
    // The table holds a single row; recreate it if it was never seeded or was
    // removed, so reads never fail on a freshly initialised database.
    await query('insert into app_settings (id) values (true) on conflict (id) do nothing');
    const result = await query<SettingsRow>('select * from app_settings where id = true');
    const row = result.rows[0];
    if (!row) throw new Error('Application settings row is missing');
    return mapSettings(row);
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const assignments: string[] = [];
    const params: QueryParam[] = [];

    for (const [key, value] of Object.entries(patch) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>) {
      if (value === undefined) continue;
      params.push(value as QueryParam);
      assignments.push(`${COLUMNS[key]} = $${params.length}`);
    }

    if (!assignments.length) return this.get();

    const result = await query<SettingsRow>(
      `update app_settings set ${assignments.join(', ')}, updated_at = now()
       where id = true returning *`,
      params,
    );
    const row = result.rows[0];
    if (!row) throw new Error('Application settings row is missing');
    return mapSettings(row);
  }
}
