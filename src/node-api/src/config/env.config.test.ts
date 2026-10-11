import { describe, expect, it } from 'vitest';
import { loadEnvConfig } from './env.config.js';

const auth = { AUTH0_DOMAIN: 'tenant.us.auth0.com', AUTH0_AUDIENCE: 'https://api.example.dev' };

describe('loadEnvConfig', () => {
  it('uses defaults when optional variables are unset', () => {
    expect(loadEnvConfig({ ...auth })).toEqual({
      port: 8081,
      diagonalTolerance: 1e-9,
      auth: {
        domain: 'tenant.us.auth0.com',
        issuer: 'https://tenant.us.auth0.com/',
        audience: 'https://api.example.dev',
      },
      corsOrigins: ['http://localhost:5173'],
    });
  });

  it('treats empty strings as unset', () => {
    const config = loadEnvConfig({
      ...auth,
      PORT: '',
      DIAGONAL_TOLERANCE: '',
      CORS_ORIGINS: '',
    });
    expect(config.port).toBe(8081);
    expect(config.diagonalTolerance).toBe(1e-9);
    expect(config.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('reads valid values', () => {
    const config = loadEnvConfig({ ...auth, PORT: '3000', DIAGONAL_TOLERANCE: '1e-6' });
    expect(config.port).toBe(3000);
    expect(config.diagonalTolerance).toBe(1e-6);
  });

  it('accepts port 0 (ephemeral port) and 65535', () => {
    expect(loadEnvConfig({ ...auth, PORT: '0' }).port).toBe(0);
    expect(loadEnvConfig({ ...auth, PORT: '65535' }).port).toBe(65535);
  });

  it.each(['abc', '1.5', '-1', '65536', 'NaN'])('rejects PORT "%s"', (port) => {
    expect(() => loadEnvConfig({ ...auth, PORT: port })).toThrow(/PORT/);
  });

  it.each(['abc', '0', '-1e-9', 'Infinity', '-Infinity', 'NaN'])(
    'rejects DIAGONAL_TOLERANCE "%s"',
    (tolerance) => {
      expect(() => loadEnvConfig({ ...auth, DIAGONAL_TOLERANCE: tolerance })).toThrow(
        /DIAGONAL_TOLERANCE/,
      );
    },
  );

  describe('auth', () => {
    it('requires AUTH0_DOMAIN', () => {
      expect(() => loadEnvConfig({ AUTH0_AUDIENCE: 'x' })).toThrow(/AUTH0_DOMAIN is required/);
      expect(() => loadEnvConfig({ ...auth, AUTH0_DOMAIN: '  ' })).toThrow(/AUTH0_DOMAIN/);
    });

    it('requires AUTH0_AUDIENCE', () => {
      expect(() => loadEnvConfig({ AUTH0_DOMAIN: 'tenant.auth0.com' })).toThrow(
        /AUTH0_AUDIENCE is required/,
      );
    });

    it.each([
      'https://tenant.auth0.com',
      'tenant.auth0.com/',
      'tenant',
      'a b.auth0.com',
      'x.com:443',
    ])('rejects AUTH0_DOMAIN "%s" (hostname only)', (domain) => {
      expect(() => loadEnvConfig({ ...auth, AUTH0_DOMAIN: domain })).toThrow(/AUTH0_DOMAIN/);
    });

    it('derives the issuer with a trailing slash', () => {
      expect(loadEnvConfig(auth).auth.issuer).toBe('https://tenant.us.auth0.com/');
    });
  });

  describe('CORS_ORIGINS', () => {
    it('parses a comma-separated list, trimming spaces and trailing slashes', () => {
      const config = loadEnvConfig({
        ...auth,
        CORS_ORIGINS: 'http://localhost:5173, https://app.example.com/',
      });
      expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://app.example.com']);
    });

    it.each(['*', 'localhost:5173', 'ftp://x.com', 'https://x.com/path', 'not a url'])(
      'rejects "%s"',
      (origin) => {
        expect(() => loadEnvConfig({ ...auth, CORS_ORIGINS: origin })).toThrow(/CORS_ORIGINS/);
      },
    );
  });
});
