import type { RequestHandler } from 'express';

// Allow-list only (never "*"): the API takes bearer tokens, so origins are explicit.
export function createCors(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    const origin = req.get('origin');
    const isAllowed = origin !== undefined && allowed.has(origin);
    res.vary('Origin');
    if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin);

    const isPreflight = req.method === 'OPTIONS' && req.get('access-control-request-method');
    if (!isPreflight) return next();

    // Answered before auth: browsers never send credentials on preflight.
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    res.status(204).end();
  };
}
