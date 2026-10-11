import { Router } from 'express';
import type { CalculateStatisticsPort } from '../../../../application/ports/inbound/calculate-statistics.port.js';
import { healthController } from '../controllers/health.controller.js';
import { createStatisticsController } from '../controllers/statistics.controller.js';

export function createRouter(calculateStatistics: CalculateStatisticsPort): Router {
  const router = Router();
  router.get('/health', healthController);
  router.post('/api/v1/statistics', createStatisticsController(calculateStatistics));
  return router;
}
