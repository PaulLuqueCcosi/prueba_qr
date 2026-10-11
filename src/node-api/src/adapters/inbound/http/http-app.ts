import express, { type Express } from 'express';
import type { CalculateStatisticsPort } from '../../../application/ports/inbound/calculate-statistics.port.js';
import type { TokenVerifierPort } from '../../../application/ports/outbound/token-verifier.port.js';
import type { LoggerPort } from '../../../application/ports/outbound/logger.port.js';
import { createDocsRouter } from './docs/docs.routes.js';
import { createAuthenticate } from './middleware/authenticate.middleware.js';
import { createCors } from './middleware/cors.middleware.js';
import { createErrorHandler } from './middleware/error-handler.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { createRequestLogger } from './middleware/request-logger.middleware.js';
import { createRouter } from './routes/api.routes.js';

export interface HttpAppDependencies {
  calculateStatistics: CalculateStatisticsPort;
  logger: LoggerPort;
  tokenVerifier: TokenVerifierPort;
  corsOrigins: readonly string[];
}

export function createHttpApp({
  calculateStatistics,
  logger,
  tokenVerifier,
  corsOrigins,
}: HttpAppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(createRequestLogger(logger));
  // CORS first so preflights are answered before authentication.
  app.use(createCors(corsOrigins));
  app.use(createDocsRouter());
  app.use(createRouter(calculateStatistics, createAuthenticate(tokenVerifier, logger)));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
