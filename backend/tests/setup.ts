/* Test bootstrap. Runs before any test file imports the application modules,
   so configuration is fixed here and `.env` never leaks into tests. */
import { mkdirSync } from 'node:fs';

process.env.NODE_ENV = 'test';
// Some shells export PORT=0; always override it for deterministic tests.
process.env.PORT = '4000';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789';
process.env.JWT_ISSUER = 'jomeforms-api-test';
process.env.JWT_AUDIENCE = 'jomeforms-web-test';
process.env.UPLOAD_DIR = './var/test-uploads';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.SEED_ADMIN_USERNAME = 'testadmin';
process.env.SEED_ADMIN_PASSWORD = 'TestAdmin123!';
process.env.SEED_ADMIN_NAME = 'Test Admin';

// Never let a plain `npm test` reach a developer database: either use the
// explicit disposable test database, or a placeholder that is never queried
// because the integration suites skip themselves.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://test:test@127.0.0.1:5432/jomeforms_test';

mkdirSync(process.env.UPLOAD_DIR, { recursive: true });

/** Integration suites are skipped (not failed) when no test database is set. */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
