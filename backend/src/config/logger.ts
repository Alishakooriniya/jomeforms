import pino from 'pino';
import { env } from './env.js';

/**
 * Structured logging. Sensitive values are never written to logs; pino redacts
 * them defensively as a second line of defence.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'jomeforms-api', env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'token',
      '*.token',
      'refreshToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service,env' },
      },
});
