import { createApp } from './app.js';
import { closePool, query } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function main(): Promise<void> {
  try {
    await query('select 1');
  } catch (error) {
    logger.fatal({ err: error }, 'cannot reach the database; refusing to start');
    process.exitCode = 1;
    return;
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Jomeforms API listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async (error) => {
      if (error) logger.error({ err: error }, 'error while closing the HTTP server');
      await closePool().catch((poolError) => logger.error({ err: poolError }, 'error closing the pool'));
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception');
    void shutdown('uncaughtException');
  });
}

void main();
