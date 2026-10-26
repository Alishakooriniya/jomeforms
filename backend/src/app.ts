import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { query } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createContainer } from './container.js';
import type { Container } from './container.js';
import { AuthorizationError } from './errors/index.js';
import {
  errorHandler,
  notFoundHandler,
  requestContext,
  requestLogger,
} from './middleware/index.js';
import { createApiRouter } from './routes/index.js';

function mountApiDocs(app: Express): void {
  const candidates = [
    fileURLToPath(new URL('../docs/openapi.yaml', import.meta.url)),
    resolve(process.cwd(), 'docs/openapi.yaml'),
  ];
  const specPath = candidates.find((path) => existsSync(path));

  if (!specPath) {
    logger.warn('OpenAPI spec not found; API docs are disabled');
    return;
  }

  const document = YAML.parse(readFileSync(specPath, 'utf8')) as Record<string, unknown>;
  app.get('/api/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(readFileSync(specPath, 'utf8'));
  });
  app.use(
    '/api/docs',
    helmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'", "'unsafe-inline'"] } }),
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: 'Jomeforms API' }),
  );
}

export function createApp(container: Container = createContainer()): Express {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(requestContext);
  app.use(requestLogger);
  app.use(
    helmet({
      // This service only returns JSON and files; CSP is applied to the docs UI.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AuthorizationError('Origin is not allowed.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  // Generous JSON limit so superadmin database-restore uploads are not capped.
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', async (_req, res) => {
    try {
      await query('select 1');
      res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'unavailable', timestamp: new Date().toISOString() });
    }
  });

  app.use(env.API_PREFIX, createApiRouter(container));

  mountApiDocs(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
