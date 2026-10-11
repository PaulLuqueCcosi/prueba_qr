import { describe, expect, it } from 'vitest';
import { loadEnvConfig } from './env.config.js';

describe('loadEnvConfig', () => {
  it('uses defaults when variables are unset', () => {
    expect(loadEnvConfig({})).toEqual({ port: 8081, diagonalTolerance: 1e-9 });
  });

  it('treats empty strings as unset', () => {
    expect(loadEnvConfig({ PORT: '', DIAGONAL_TOLERANCE: '' })).toEqual({
      port: 8081,
      diagonalTolerance: 1e-9,
    });
  });

  it('reads valid values', () => {
    expect(loadEnvConfig({ PORT: '3000', DIAGONAL_TOLERANCE: '1e-6' })).toEqual({
      port: 3000,
      diagonalTolerance: 1e-6,
    });
  });

  it('accepts port 0 (ephemeral port) and 65535', () => {
    expect(loadEnvConfig({ PORT: '0' }).port).toBe(0);
    expect(loadEnvConfig({ PORT: '65535' }).port).toBe(65535);
  });

  it.each(['abc', '1.5', '-1', '65536', 'NaN'])('rejects PORT "%s"', (port) => {
    expect(() => loadEnvConfig({ PORT: port })).toThrow(/PORT/);
  });

  it.each(['abc', '0', '-1e-9', 'Infinity', '-Infinity', 'NaN'])(
    'rejects DIAGONAL_TOLERANCE "%s"',
    (tolerance) => {
      expect(() => loadEnvConfig({ DIAGONAL_TOLERANCE: tolerance })).toThrow(/DIAGONAL_TOLERANCE/);
    },
  );
});
