import type { RequestHandler } from 'express';
import type { CalculateStatisticsPort } from '../../../../application/ports/inbound/calculate-statistics.port.js';

export function createStatisticsController(useCase: CalculateStatisticsPort): RequestHandler {
  return (req, res) => {
    res.status(200).json(useCase.execute(req.body));
  };
}
