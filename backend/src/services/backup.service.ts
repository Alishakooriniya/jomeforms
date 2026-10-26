import { query, withTransaction } from '../config/database.js';
import { ValidationError } from '../errors/index.js';
import type { AuditContext, AuditService } from './audit.service.js';

/**
 * Full-database backup. Rows are exported verbatim (snake_case) and restored
 * through jsonb_populate_recordset, so no column mapping has to be maintained
 * as the schema evolves. Superadmin-only at the route level.
 *
 * Sessions are truncated on restore but never exported: after a restore every
 * client signs in again, which is the correct behaviour anyway.
 */
const EXPORT_TABLES = [
  'companies',
  'users',
  'user_permissions',
  'clients',
  'form_templates',
  'form_template_versions',
  'documents',
  'document_status_history',
  'document_scans',
  'case_workflow_evidence',
  'reminders',
  'letterhead_prints',
  'audit_logs',
  'app_settings',
  'number_sequences',
] as const;

/** Everything truncated on import, including tables never exported. */
const TRUNCATE_TABLES = [...EXPORT_TABLES, 'sessions'] as const;

type ExportTable = (typeof EXPORT_TABLES)[number];
type BackupTables = Partial<Record<ExportTable, unknown[]>>;

export interface BackupDump {
  version: 1;
  kind: 'jomeforms-backup';
  exportedAt: string;
  tables: BackupTables;
}

function isExportTable(value: string): value is ExportTable {
  return (EXPORT_TABLES as readonly string[]).includes(value);
}

export class BackupService {
  constructor(private readonly audit: AuditService) {}

  async export(): Promise<BackupDump> {
    const tables: BackupTables = {};
    for (const table of EXPORT_TABLES) {
      const result = await query<{ rows: unknown[] }>(
        `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as rows from (select * from ${table}) t`,
      );
      tables[table] = result.rows[0]?.rows ?? [];
    }
    return {
      version: 1,
      kind: 'jomeforms-backup',
      exportedAt: new Date().toISOString(),
      tables,
    };
  }

  /**
   * Restore semantics: the dump replaces the database inside one transaction —
   * all listed tables are truncated, then rows are re-inserted preserving ids.
   * Anything missing from the dump is simply empty afterwards.
   */
  async import(payload: unknown, context: AuditContext): Promise<{ restored: number }> {
    const dump = payload as Partial<BackupDump> | null;
    if (!dump || dump.kind !== 'jomeforms-backup' || !dump.tables || typeof dump.tables !== 'object') {
      throw new ValidationError([{ message: 'Not a valid jomeforms backup file.' }]);
    }

    const entries = Object.entries(dump.tables).filter(
      (entry): entry is [ExportTable, unknown[]] => isExportTable(entry[0]) && Array.isArray(entry[1]),
    );
    if (!entries.length) {
      throw new ValidationError([{ message: 'Backup file contains no restorable tables.' }]);
    }

    let restored = 0;
    await withTransaction(async (client) => {
      await client.query(`truncate table ${TRUNCATE_TABLES.join(', ')} restart identity cascade`);
      for (const [table, rows] of entries) {
        if (!rows.length) continue;
        await client.query(
          `insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`,
          [JSON.stringify(rows)],
        );
        restored += rows.length;
      }
    });

    await this.audit.record(context, {
      action: 'بازیابی پشتیبان پایگاه‌داده',
      entity: 'settings',
      detail: `${restored} رکورد از ${entries.length} جدول بازیابی شد`,
    });

    return { restored };
  }
}
