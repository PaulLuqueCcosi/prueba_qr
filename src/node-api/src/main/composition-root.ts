import type { Express } from 'express';
import { createHttpApp } from '../adapters/inbound/http/http-app.js';
import { JsonLogger } from '../adapters/outbound/logging/json-logger.adapter.js';
import { CalculateStatisticsUseCase } from '../application/use-cases/calculate-statistics.use-case.js';
import type { CalculateStatisticsPort } from '../application/ports/inbound/calculate-statistics.port.js';
import type { LoggerPort } from '../application/ports/outbound/logger.port.js';
import type { EnvConfig } from '../config/env.config.js';

export type AppOverrides = Partial<{
  logger: LoggerPort;
  calculateStatistics: CalculateStatisticsPort;
}>;

// The only place that knows concrete classes; overrides let tests inject fakes
// without opening a port.
export function createApp(config: EnvConfig, overrides: AppOverrides = {}): Express {
  const logger = overrides.logger ?? new JsonLogger();
  const calculateStatistics =
    overrides.calculateStatistics ?? new CalculateStatisticsUseCase(config.diagonalTolerance);
  return createHttpApp({ calculateStatistics, logger });
}
