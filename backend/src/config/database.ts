import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

const { Pool } = pg;

export type QueryParam = string | number | boolean | null | Date | string[] | object;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  application_name: 'jomeforms-api',
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'unexpected PostgreSQL pool error');
});

export type DbClient = pg.PoolClient;

/** Run a single parameterized query against the pool. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<pg.QueryResult<T>> {
  const startedAt = Date.now();
  try {
    return await pool.query<T>(text, params);
  } catch (error) {
    logger.error({ err: error, durationMs: Date.now() - startedAt }, 'database query failed');
    throw error;
  }
}

/** Run a set of statements atomically. */
export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
