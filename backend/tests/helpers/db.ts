import { query } from '../../src/config/database.js';
import { runMigrations } from '../../src/db/migrate.js';
import { seed } from '../../src/db/seed.js';

/**
 * This module is only imported by integration suites, which are skipped when
 * TEST_DATABASE_URL is missing, so it never touches a developer database.
 */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

let schemaReady = false;

async function assertTestDatabase(): Promise<void> {
  if (!hasTestDatabase) return;
  const url = process.env.DATABASE_URL ?? '';
  if (!/test/i.test(url)) {
    throw new Error(
      'Refusing to run destructive tests: DATABASE_URL does not look like a test database. ' +
        'Set TEST_DATABASE_URL to a dedicated disposable database.',
    );
  }
  if (!schemaReady) {
    await runMigrations();
    schemaReady = true;
  }
}

/** Empty every table except the migration ledger, then re-seed the catalog. */
export async function resetDatabase(): Promise<void> {
  if (!hasTestDatabase) return;
  await assertTestDatabase();

  const tables = await query<{ tablename: string }>(
    `select tablename from pg_tables
     where schemaname = 'public' and tablename <> 'schema_migrations'`,
  );
  if (tables.rows.length) {
    const list = tables.rows.map((row) => `"${row.tablename}"`).join(', ');
    await query(`truncate table ${list} restart identity cascade`);
  }
  await seed();
}
