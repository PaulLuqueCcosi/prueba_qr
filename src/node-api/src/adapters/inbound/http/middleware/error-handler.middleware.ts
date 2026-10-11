import type { ErrorRequestHandler, Response } from 'express';
import { InvalidMatrixError } from '../../../../domain/invalid-matrix.error.js';
import type { LoggerPort } from '../../../../application/ports/outbound/logger.port.js';

function send(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

// The domain error -> HTTP status mapping lives here so the domain stays transport-agnostic.
export function createErrorHandler(logger: LoggerPort): ErrorRequestHandler {
  // Express requires the 4-argument signature to treat this as an error handler.
  return (err: unknown, _req, res, _next) => {
    if (err instanceof InvalidMatrixError) {
      return send(res, 422, 'INVALID_MATRIX', err.message);
    }

    // body-parser tags its errors with a `type`; matching on it avoids parsing messages.
    const type = (err as { type?: string } | null)?.type;
    if (type === 'entity.parse.failed') {
      return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
    }
    if (type === 'entity.too.large') {
      return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the size limit');
    }

    logger.error('unhandled error', { error: err instanceof Error ? err.stack : String(err) });
    return send(res, 500, 'INTERNAL_ERROR', 'Unexpected error');
  };
}
