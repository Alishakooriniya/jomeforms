import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from '../config/database.js';
import { logger } from '../config/logger.js';
import { migrateStoredDatesToJalali } from './jalali-date-migration.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));
const ADVISORY_LOCK_KEY = 48_271_903;

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    create table if not exists schema_migrations (
      file       text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

export async function runMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  const applied = new Set(
    (await query<{ file: string }>('select file from schema_migrations')).rows.map((row) => row.file),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  const ran: string[] = [];
  try {
    // Prevent two app instances from migrating at the same time.
    await client.query('select pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      logger.info({ migration: file }, 'applying migration');
      try {
        await client.query('BEGIN');
        if (file === '004_persian_dates.sql') await migrateStoredDatesToJalali(client);
        await client.query(sql);
        await client.query('insert into schema_migrations (file) values ($1)', [file]);
        await client.query('COMMIT');
        ran.push(file);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined);
    client.release();
  }

  if (!ran.length) logger.info('database schema is up to date');
  return ran;
}

/** Development-only destructive reset. */
export async function dropAllTables(): Promise<void> {
  await query('drop schema public cascade');
  await query('create schema public');
}
