import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { LogFields, LoggerPort } from '../../../application/ports/outbound/logger.port.js';
import {
  InvalidTokenError,
  type TokenVerifierPort,
  type VerifiedToken,
} from '../../../application/ports/outbound/token-verifier.port.js';
import { createApp } from '../../../main/composition-root.js';

const config = {
  port: 0,
  diagonalTolerance: 1e-9,
  auth: {
    endpoint: 'https://t.logto.app',
    issuer: 'https://t.logto.app/oidc',
    jwksUri: 'https://t.logto.app/oidc/jwks',
    audience: 'aud',
  },
  corsOrigins: ['http://localhost:5173'],
};
const body = {
  matrices: { original: [[1]], q: [[1]], r: [[1]] },
};

const identities: Record<string, VerifiedToken> = {
  'good-token': { subject: 'u1' },
};
const verifier: TokenVerifierPort = {
  async verify(token) {
    const identity = identities[token];
    if (!identity) throw new InvalidTokenError('invalid_signature');
    return identity;
  },
};

class Recorder implements LoggerPort {
  readonly lines: string[] = [];
  info(m: string, f: LogFields = {}) {
    this.lines.push(JSON.stringify({ m, ...f }));
  }
  warn(m: string, f: LogFields = {}) {
    this.lines.push(JSON.stringify({ m, ...f }));
  }
  error(m: string, f: LogFields = {}) {
    this.lines.push(JSON.stringify({ m, ...f }));
  }
}

function build() {
  const logger = new Recorder();
  return { app: createApp(config, { logger, tokenVerifier: verifier }), logger };
}

const post = (app: ReturnType<typeof build>['app']) => request(app).post('/api/v1/statistics');

describe('authentication on POST /api/v1/statistics', () => {
  it('returns 401 UNAUTHORIZED with a bare Bearer challenge when there is no header', async () => {
    const res = await post(build().app).send(body);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHORIZED', message: expect.any(String) } });
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it.each(['Basic abc', 'Bearer', 'Bearer ', 'Bearer a b', 'good-token'])(
    'returns 401 for malformed header "%s"',
    async (header) => {
      const res = await post(build().app).set('Authorization', header).send(body);
      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
    },
  );

  it('returns 401 with error="invalid_token" for a token that does not verify', async () => {
    const res = await post(build().app).set('Authorization', 'Bearer bogus').send(body);
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe('Bearer error="invalid_token"');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 for any valid token (no scopes: every authenticated user is authorized)', async () => {
    const res = await post(build().app).set('Authorization', 'Bearer good-token').send(body);
    expect(res.status).toBe(200);
  });

  it('accepts the Bearer scheme case-insensitively', async () => {
    const res = await post(build().app).set('Authorization', 'bearer good-token').send(body);
    expect(res.status).toBe(200);
  });

  it('rejects before parsing the body (bad JSON without a token is 401, not 400)', async () => {
    const res = await post(build().app)
      .set('Content-Type', 'application/json')
      .send('{"matrices": ');
    expect(res.status).toBe(401);
  });

  it('fails closed with 401 when the verifier throws an unexpected error', async () => {
    const broken: TokenVerifierPort = {
      async verify() {
        throw new Error('jwks down');
      },
    };
    const app = createApp(config, { logger: new Recorder(), tokenVerifier: broken });
    const res = await post(app).set('Authorization', 'Bearer x').send(body);
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('jwks');
  });

  it('never echoes the token in the body, headers or logs', async () => {
    const { app, logger } = build();
    const secret = 'super-secret-token-value';
    const res = await post(app).set('Authorization', `Bearer ${secret}`).send(body);
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain(secret);
    expect(JSON.stringify(res.headers)).not.toContain(secret);
    expect(logger.lines.join('\n')).not.toContain(secret);
    expect(logger.lines.some((l) => l.includes('invalid_signature'))).toBe(true);
  });
});

describe('public routes', () => {
  it.each(['/health', '/openapi.yaml', '/docs/'])('serves %s without a token', async (path) => {
    const res = await request(build().app).get(path);
    expect(res.status).toBe(200);
  });

  it('keeps 404 NOT_FOUND for unknown routes', async () => {
    const res = await request(build().app).get('/nope');
    expect(res.status).toBe(404);
  });
});

describe('CORS', () => {
  const preflight = (origin: string) =>
    request(build().app)
      .options('/api/v1/statistics')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

  it('answers the preflight without a token and allows the configured origin', async () => {
    const res = await preflight('http://localhost:5173');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,OPTIONS');
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
    expect(res.headers['vary']).toMatch(/Origin/);
  });

  it('sends no CORS headers for a disallowed origin', async () => {
    const res = await preflight('http://evil.example');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-methods']).toBeUndefined();
  });

  it('adds the allow-origin header to normal responses of an allowed origin only', async () => {
    const app = build().app;
    const ok = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    const bad = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never answers with a wildcard origin', async () => {
    const res = await preflight('http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});
