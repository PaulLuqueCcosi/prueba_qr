import { JsonLogger } from '../adapters/outbound/logging/json-logger.adapter.js';
import { loadEnvConfig } from '../config/env.config.js';
import { createApp } from './composition-root.js';

const logger = new JsonLogger();

try {
  const config = loadEnvConfig();
  createApp(config, { logger }).listen(config.port, () => {
    logger.info('server listening', {
      port: config.port,
      diagonalTolerance: config.diagonalTolerance,
      issuer: config.auth.issuer,
      corsOrigins: config.corsOrigins,
    });
  });
} catch (error) {
  logger.error('failed to start', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}
