import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

/**
 * Structured request logging. Headers containing credentials are redacted by
 * the logger configuration; bodies are never logged by default.
 */
export const requestLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    requestId: (req as unknown as { requestId?: string }).requestId,
  }),
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/api/openapi.yaml',
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
