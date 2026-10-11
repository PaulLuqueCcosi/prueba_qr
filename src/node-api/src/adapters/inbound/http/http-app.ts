import express, { type Express } from 'express';
import type { CalculateStatisticsPort } from '../../../application/ports/inbound/calculate-statistics.port.js';
import type { LoggerPort } from '../../../application/ports/outbound/logger.port.js';
import { createDocsRouter } from './docs/docs.routes.js';
import { createErrorHandler } from './middleware/error-handler.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { createRequestLogger } from './middleware/request-logger.middleware.js';
import { createRouter } from './routes/api.routes.js';

export interface HttpAppDependencies {
  calculateStatistics: CalculateStatisticsPort;
  logger: LoggerPort;
}

export function createHttpApp({ calculateStatistics, logger }: HttpAppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(createRequestLogger(logger));
  app.use(express.json({ limit: '1mb' }));
  app.use(createDocsRouter());
  app.use(createRouter(calculateStatistics));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
