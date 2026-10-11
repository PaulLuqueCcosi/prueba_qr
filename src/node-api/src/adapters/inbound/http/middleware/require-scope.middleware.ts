import type { RequestHandler } from 'express';
import { getAuth, unauthorized } from './authenticate.middleware.js';

// Must run after authenticate. Missing identity fails closed with 401.
export function requireScope(scope: string): RequestHandler {
  return (_req, res, next) => {
    const auth = getAuth(res);
    if (!auth) return unauthorized(res, false);
    if (!auth.scopes.includes(scope)) {
      res.setHeader('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${scope}"`);
      res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'Insufficient scope for this resource' } });
      return;
    }
    next();
  };
}
