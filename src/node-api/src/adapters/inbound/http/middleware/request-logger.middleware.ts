import type { RequestHandler } from 'express';
import type { LoggerPort } from '../../../../application/ports/outbound/logger.port.js';

export function createRequestLogger(logger: LoggerPort): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      logger.info('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      });
    });
    next();
  };
}
