import express, { Router, type RequestHandler } from 'express';
import type { CalculateStatisticsPort } from '../../../../application/ports/inbound/calculate-statistics.port.js';
import { healthController } from '../controllers/health.controller.js';
import { createStatisticsController } from '../controllers/statistics.controller.js';

export function createRouter(
  calculateStatistics: CalculateStatisticsPort,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.get('/health', healthController);
  // Auth runs before the body parser so unauthenticated callers cannot make us parse payloads.
  router.post(
    '/api/v1/statistics',
    authenticate,
    express.json({ limit: '1mb' }),
    createStatisticsController(calculateStatistics),
  );
  return router;
}
