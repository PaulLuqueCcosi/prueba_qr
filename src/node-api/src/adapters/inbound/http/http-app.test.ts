import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { CalculateStatisticsPort } from '../../../application/ports/inbound/calculate-statistics.port.js';
import type { LogFields, LoggerPort } from '../../../application/ports/outbound/logger.port.js';
import {
  InvalidTokenError,
  type TokenVerifierPort,
} from '../../../application/ports/outbound/token-verifier.port.js';
import { createApp } from '../../../main/composition-root.js';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  fields: LogFields;
}

class FakeLogger implements LoggerPort {
  readonly entries: LogEntry[] = [];
  info(message: string, fields: LogFields = {}): void {
    this.entries.push({ level: 'info', message, fields });
  }
  warn(message: string, fields: LogFields = {}): void {
    this.entries.push({ level: 'warn', message, fields });
  }
  error(message: string, fields: LogFields = {}): void {
    this.entries.push({ level: 'error', message, fields });
  }
}

const config = {
  port: 0,
  diagonalTolerance: 1e-9,
  auth: {
    endpoint: 'https://tenant.example.logto.app',
    issuer: 'https://tenant.example.logto.app/oidc',
    jwksUri: 'https://tenant.example.logto.app/oidc/jwks',
    audience: 'https://api.example.dev',
  },
  corsOrigins: ['http://localhost:5173'],
};
const AUTH = { Authorization: 'Bearer valid-token' };
const fakeVerifier: TokenVerifierPort = {
  async verify(token) {
    if (token !== 'valid-token') throw new InvalidTokenError('invalid_signature');
    return { subject: 'user-1' };
  },
};
const matrices = {
  original: [
    [1, 2],
    [3, 4],
  ],
  q: [
    [1, 0],
    [0, 1],
  ],
  r: [
    [5, 6],
    [0, 7],
  ],
};

function build(overrides: Parameters<typeof createApp>[1] = {}) {
  const logger = new FakeLogger();
  const app = createApp(config, { logger, tokenVerifier: fakeVerifier, ...overrides });
  return { app, logger };
}

function expectErrorBody(body: unknown, code: string): void {
  expect(body).toEqual({ error: { code, message: expect.any(String) } });
  expect((body as { error: { code: string } }).error.code).toBe(code);
}

describe('POST /api/v1/statistics', () => {
  it('returns 200 with the statistics as JSON', async () => {
    const { app } = build();
    const res = await request(app).post('/api/v1/statistics').set(AUTH).send({ matrices });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      max: 7,
      min: 0,
      average: 2.5,
      sum: 30,
      isDiagonal: { original: false, q: true, r: false },
      anyDiagonal: true,
    });
  });

  it('applies the configured diagonal tolerance', async () => {
    const noisy = {
      ...matrices,
      original: [
        [1, 0.01],
        [0, 1],
      ],
    };
    const strict = await request(build().app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .send({ matrices: noisy });
    const loose = await request(
      createApp(
        { ...config, diagonalTolerance: 0.1 },
        { logger: new FakeLogger(), tokenVerifier: fakeVerifier },
      ),
    )
      .post('/api/v1/statistics')
      .set(AUTH)
      .send({ matrices: noisy });

    expect(strict.body.isDiagonal.original).toBe(false);
    expect(loose.body.isDiagonal.original).toBe(true);
  });

  it.each([
    ['empty matrix', { ...matrices, q: [] }],
    ['empty row', { ...matrices, q: [[]] }],
    ['rows of different length', { ...matrices, r: [[1, 2], [3]] }],
    [
      'a string value',
      {
        ...matrices,
        original: [
          [1, 'a'],
          [3, 4],
        ],
      },
    ],
    [
      'a null value',
      {
        ...matrices,
        original: [
          [1, null],
          [3, 4],
        ],
      },
    ],
    [
      'a boolean value',
      {
        ...matrices,
        original: [
          [1, true],
          [3, 4],
        ],
      },
    ],
    ['a row that is not an array', { ...matrices, original: [[1, 2], 5] }],
    ['a missing matrix', { original: matrices.original, q: matrices.q }],
  ])('returns 422 INVALID_MATRIX for %s', async (_label, bad) => {
    const res = await request(build().app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .send({ matrices: bad });

    expect(res.status).toBe(422);
    expectErrorBody(res.body, 'INVALID_MATRIX');
  });

  it('returns 422 when "matrices" is missing from the body', async () => {
    const res = await request(build().app).post('/api/v1/statistics').set(AUTH).send({});
    expect(res.status).toBe(422);
    expectErrorBody(res.body, 'INVALID_MATRIX');
  });

  it('returns 422 for a JSON array body', async () => {
    const res = await request(build().app).post('/api/v1/statistics').set(AUTH).send([1, 2]);
    expect(res.status).toBe(422);
    expectErrorBody(res.body, 'INVALID_MATRIX');
  });

  it('returns 422 when a number overflows to Infinity during JSON parsing', async () => {
    const raw = '{"matrices":{"original":[[1e999]],"q":[[1]],"r":[[1]]}}';
    const res = await request(build().app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .set('Content-Type', 'application/json')
      .send(raw);
    expect(res.status).toBe(422);
    expectErrorBody(res.body, 'INVALID_MATRIX');
  });

  it('names the offending matrix and position in the message', async () => {
    const res = await request(build().app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .send({ matrices: { ...matrices, r: [[1, 2], [3]] } });
    expect(res.body.error.message).toMatch(/"r".*row 1/);
  });

  it('returns 400 INVALID_JSON for malformed JSON', async () => {
    const res = await request(build().app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .set('Content-Type', 'application/json')
      .send('{"matrices": ');

    expect(res.status).toBe(400);
    expectErrorBody(res.body, 'INVALID_JSON');
  });

  it('returns 413 PAYLOAD_TOO_LARGE above 1 MB', async () => {
    const huge = JSON.stringify({
      matrices: { ...matrices, original: [new Array(250_000).fill(1234567)] },
    });
    expect(Buffer.byteLength(huge)).toBeGreaterThan(1024 * 1024);

    const res = await request(build().app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .set('Content-Type', 'application/json')
      .send(huge);

    expect(res.status).toBe(413);
    expectErrorBody(res.body, 'PAYLOAD_TOO_LARGE');
  });

  it('returns 500 INTERNAL_ERROR without leaking the internal message', async () => {
    const boom: CalculateStatisticsPort = {
      execute() {
        throw new Error('secret database password leaked');
      },
    };
    const { app, logger } = build({ calculateStatistics: boom });

    const res = await request(app).post('/api/v1/statistics').set(AUTH).send({ matrices });

    expect(res.status).toBe(500);
    expectErrorBody(res.body, 'INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret');
    const errorLog = logger.entries.find((e) => e.level === 'error');
    expect(errorLog?.message).toBe('unhandled error');
    expect(String(errorLog?.fields['error'])).toContain('secret database password leaked');
  });

  it('returns 500 INTERNAL_ERROR when a non-Error value is thrown', async () => {
    const boom: CalculateStatisticsPort = {
      execute() {
        throw 'plain string';
      },
    };
    const res = await request(build({ calculateStatistics: boom }).app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .send({ matrices });
    expect(res.status).toBe(500);
    expectErrorBody(res.body, 'INTERNAL_ERROR');
  });

  it('forwards the parsed body to the use case', async () => {
    const received: unknown[] = [];
    const spy: CalculateStatisticsPort = {
      execute(input) {
        received.push(input);
        return {
          max: 1,
          min: 1,
          average: 1,
          sum: 1,
          isDiagonal: { original: true, q: true, r: true },
          anyDiagonal: true,
        };
      },
    };
    const res = await request(build({ calculateStatistics: spy }).app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .send({ matrices });
    expect(res.status).toBe(200);
    expect(received).toEqual([{ matrices }]);
  });
});

describe('routing', () => {
  it('returns 404 NOT_FOUND for an unknown route', async () => {
    const res = await request(build().app).get('/nope');
    expect(res.status).toBe(404);
    expectErrorBody(res.body, 'NOT_FOUND');
  });

  it('returns 404 NOT_FOUND for GET on the POST route', async () => {
    const res = await request(build().app).get('/api/v1/statistics');
    expect(res.status).toBe(404);
    expectErrorBody(res.body, 'NOT_FOUND');
  });

  it('does not advertise the framework', async () => {
    const res = await request(build().app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /health', () => {
  it('returns 200 {"status":"ok"}', async () => {
    const res = await request(build().app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('documentation', () => {
  it('serves the OpenAPI spec as YAML', async () => {
    const res = await request(build().app).get('/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/yaml/);
    expect(res.text).toMatch(/^openapi:\s*['"]?3\.0\.3/m);
    expect(res.text).toContain('/api/v1/statistics');
  });

  it('serves Swagger UI as HTML on /docs', async () => {
    const res = await request(build().app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});

describe('request logging', () => {
  it('writes exactly one info entry per request with method, path, status and duration', async () => {
    const { app, logger } = build();

    await request(app).get('/health');
    await request(app).post('/api/v1/statistics').set(AUTH).send({ matrices });
    await request(app).get('/missing');

    const requests = logger.entries.filter((e) => e.message === 'request');
    expect(requests).toHaveLength(3);
    expect(requests.map((e) => [e.fields['method'], e.fields['path'], e.fields['status']])).toEqual(
      [
        ['GET', '/health', 200],
        ['POST', '/api/v1/statistics', 200],
        ['GET', '/missing', 404],
      ],
    );
    for (const entry of requests) {
      expect(entry.level).toBe('info');
      expect(typeof entry.fields['durationMs']).toBe('number');
    }
  });

  it('logs the request even when the body is malformed JSON', async () => {
    const { app, logger } = build();
    await request(app)
      .post('/api/v1/statistics')
      .set(AUTH)
      .set('Content-Type', 'application/json')
      .send('{bad');
    const entry = logger.entries.find((e) => e.message === 'request');
    expect(entry?.fields['status']).toBe(400);
  });
});
