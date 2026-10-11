import { JsonLogger } from '../adapters/outbound/logging/json-logger.adapter.js';
import { loadEnvConfig } from '../config/env.config.js';
import { createApp } from './composition-root.js';

const logger = new JsonLogger();

try {
  const config = loadEnvConfig();
  const server = createApp(config, { logger }).listen(config.port, () => {
    logger.info('server listening', {
      port: config.port,
      diagonalTolerance: config.diagonalTolerance,
      issuer: config.auth.issuer,
      corsOrigins: config.corsOrigins,
    });
  });

  // Containers stop with SIGTERM: finish in-flight requests, then exit (forced after 10 s).
  const shutdown = (signal: string) => {
    logger.info('shutting down', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  logger.error('failed to start', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}
