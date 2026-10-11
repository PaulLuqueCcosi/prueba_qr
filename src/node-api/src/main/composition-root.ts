import type { Express } from 'express';
import { createHttpApp } from '../adapters/inbound/http/http-app.js';
import {
  JoseTokenVerifier,
  createRemoteKeySet,
} from '../adapters/outbound/auth/jose-token-verifier.adapter.js';
import { JsonLogger } from '../adapters/outbound/logging/json-logger.adapter.js';
import { CalculateStatisticsUseCase } from '../application/use-cases/calculate-statistics.use-case.js';
import type { CalculateStatisticsPort } from '../application/ports/inbound/calculate-statistics.port.js';
import type { TokenVerifierPort } from '../application/ports/outbound/token-verifier.port.js';
import type { LoggerPort } from '../application/ports/outbound/logger.port.js';
import type { EnvConfig } from '../config/env.config.js';

export type AppOverrides = Partial<{
  logger: LoggerPort;
  calculateStatistics: CalculateStatisticsPort;
  tokenVerifier: TokenVerifierPort;
}>;

// The only place that knows concrete classes; overrides let tests inject fakes
// without opening a port.
export function createApp(config: EnvConfig, overrides: AppOverrides = {}): Express {
  const logger = overrides.logger ?? new JsonLogger();
  const calculateStatistics =
    overrides.calculateStatistics ?? new CalculateStatisticsUseCase(config.diagonalTolerance);
  const tokenVerifier =
    overrides.tokenVerifier ??
    new JoseTokenVerifier({
      issuer: config.auth.issuer,
      audience: config.auth.audience,
      keySet: createRemoteKeySet(config.auth.domain),
    });
  return createHttpApp({
    calculateStatistics,
    logger,
    tokenVerifier,
    corsOrigins: config.corsOrigins,
  });
}
