import { describe, expect, it } from 'vitest';
import { loadEnvConfig } from './env.config.js';

const auth = {
  LOGTO_ENDPOINT: 'https://tenant.logto.app',
  LOGTO_APP_ID: 'app-id',
};

describe('loadEnvConfig', () => {
  it('uses defaults when optional variables are unset', () => {
    expect(loadEnvConfig({ ...auth })).toEqual({
      port: 8081,
      diagonalTolerance: 1e-9,
      auth: {
        endpoint: 'https://tenant.logto.app',
        issuer: 'https://tenant.logto.app/oidc',
        jwksUri: 'https://tenant.logto.app/oidc/jwks',
        audience: 'app-id',
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
    it('requires LOGTO_ENDPOINT', () => {
      expect(() => loadEnvConfig({ LOGTO_APP_ID: 'x' })).toThrow(/LOGTO_ENDPOINT is required/);
      expect(() => loadEnvConfig({ ...auth, LOGTO_ENDPOINT: '  ' })).toThrow(/LOGTO_ENDPOINT/);
    });

    it('requires LOGTO_APP_ID', () => {
      expect(() => loadEnvConfig({ LOGTO_ENDPOINT: 'https://tenant.logto.app' })).toThrow(
        /LOGTO_APP_ID is required/,
      );
    });

    it.each([
      'tenant.logto.app',
      'https://tenant.logto.app/oidc',
      'https://tenant.logto.app/?a=1',
      'ftp://tenant.logto.app',
      'not a url',
    ])('rejects LOGTO_ENDPOINT "%s" (plain origin only)', (endpoint) => {
      expect(() => loadEnvConfig({ ...auth, LOGTO_ENDPOINT: endpoint })).toThrow(/LOGTO_ENDPOINT/);
    });

    it('derives issuer and JWKS URI, ignoring a trailing slash', () => {
      const config = loadEnvConfig({ ...auth, LOGTO_ENDPOINT: 'https://tenant.logto.app/' }).auth;
      expect(config.issuer).toBe('https://tenant.logto.app/oidc');
      expect(config.jwksUri).toBe('https://tenant.logto.app/oidc/jwks');
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
