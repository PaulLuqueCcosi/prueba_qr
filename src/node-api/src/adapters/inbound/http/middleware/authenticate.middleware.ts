import type { RequestHandler, Response } from 'express';
import type { LoggerPort } from '../../../../application/ports/outbound/logger.port.js';
import {
  InvalidTokenError,
  type TokenVerifierPort,
  type VerifiedToken,
} from '../../../../application/ports/outbound/token-verifier.port.js';

const BEARER = /^Bearer ([^\s]+)$/i;

export function unauthorized(res: Response, tokenPresent: boolean): void {
  res.setHeader('WWW-Authenticate', tokenPresent ? 'Bearer error="invalid_token"' : 'Bearer');
  // Same message for every cause: never tell a caller why verification failed.
  res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
}

export function getAuth(res: Response): VerifiedToken | undefined {
  return res.locals['auth'] as VerifiedToken | undefined;
}

export function createAuthenticate(
  verifier: TokenVerifierPort,
  logger: LoggerPort,
): RequestHandler {
  return async (req, res, next) => {
    const match = BEARER.exec(req.get('authorization') ?? '');
    if (!match?.[1]) {
      logger.warn('auth rejected', { reason: 'missing_or_malformed_header' });
      return unauthorized(res, false);
    }
    try {
      res.locals['auth'] = await verifier.verify(match[1]);
      next();
    } catch (error) {
      // Only a reason code is logged; the token itself never reaches the logs.
      const reason = error instanceof InvalidTokenError ? error.reason : 'verifier_error';
      logger.warn('auth rejected', { reason });
      unauthorized(res, true);
    }
  };
}
