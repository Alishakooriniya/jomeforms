import { closePool, query } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { dropAllTables, runMigrations } from './migrate.js';
import { seed } from './seed.js';

async function verify(): Promise<void> {
  const tables = await query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  );
  const counts = await query<{
    users: string;
    clients: string;
    documents: string;
    templates: string;
    permissions: string;
    roles: string;
  }>(`
    select
      (select count(*)::text from users) as users,
      (select count(*)::text from clients) as clients,
      (select count(*)::text from documents) as documents,
      (select count(*)::text from form_templates) as templates,
      (select count(*)::text from permissions) as permissions,
      (select count(*)::text from roles) as roles
  `);

  logger.info({ tables: tables.rows.map((row) => row.table_name) }, 'schema verification');
  logger.info(counts.rows[0], 'row counts');
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'migrate': {
      const ran = await runMigrations();
      logger.info({ applied: ran }, 'migrations complete');
      break;
    }
    case 'seed': {
      await runMigrations();
      await seed();
      logger.info('seed complete');
      break;
    }
    case 'reset': {
      if (env.isProduction) {
        throw new Error('db:reset is disabled in production.');
      }
      await dropAllTables();
      await runMigrations();
      await seed();
      logger.info('database reset complete');
      break;
    }
    case 'verify': {
      await verify();
      break;
    }
    default:
      throw new Error('Usage: tsx src/db/cli.ts <migrate|seed|reset|verify>');
  }
}

main()
  .catch((error) => {
    logger.error({ err: error }, 'database command failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
