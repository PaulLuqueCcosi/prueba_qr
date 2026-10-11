import { describe, expect, it } from 'vitest';
import type { Matrices, Matrix } from './matrix.types.js';
import { computeStatistics } from './statistics.service.js';

const TOL = 1e-9;
const same = (m: Matrix): Matrices => ({ original: m, q: m, r: m });

describe('computeStatistics', () => {
  it('computes max, min, sum and average over all three matrices together', () => {
    const stats = computeStatistics(
      {
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
      },
      TOL,
    );
    expect(stats.max).toBe(7);
    expect(stats.min).toBe(0);
    expect(stats.sum).toBe(30);
    expect(stats.average).toBe(30 / 12);
  });

  it('handles a single value', () => {
    const stats = computeStatistics(same([[5]]), TOL);
    expect(stats).toMatchObject({ max: 5, min: 5, sum: 15, average: 5 });
  });

  it('handles negative values', () => {
    const stats = computeStatistics({ original: [[-1, -2]], q: [[-3, -4]], r: [[-5, -6]] }, TOL);
    expect(stats).toMatchObject({ max: -1, min: -6, sum: -21, average: -3.5 });
  });

  it('handles decimals', () => {
    const stats = computeStatistics(same([[0.5, 1.5]]), TOL);
    expect(stats.sum).toBe(6);
    expect(stats.average).toBe(1);
  });

  it('keeps precision when summing many 0.1 values (compensated sum)', () => {
    const row = new Array<number>(1000).fill(0.1);
    const stats = computeStatistics(same([row]), TOL);
    expect(Math.abs(stats.sum - 300)).toBeLessThan(1e-12);
  });

  it('recovers a small value lost between huge ones (1e16 + 1 - 1e16)', () => {
    const stats = computeStatistics({ original: [[1e16]], q: [[1]], r: [[-1e16]] }, TOL);
    expect(stats.sum).toBe(1);
  });

  it('does not overflow the stack on about 1e6 values', () => {
    const row = new Array<number>(1_000_000).fill(1);
    row[500_000] = 9;
    const stats = computeStatistics({ original: [row], q: [[0]], r: [[-2]] }, TOL);
    expect(stats.max).toBe(9);
    expect(stats.min).toBe(-2);
    expect(stats.sum).toBe(1_000_000 + 8 - 2);
  });

  it('evaluates the diagonal flag per matrix and derives anyDiagonal', () => {
    const stats = computeStatistics(
      {
        original: [
          [1, 2],
          [3, 4],
        ],
        q: [
          [1, 0],
          [0, 1],
        ],
        r: [
          [1, 5],
          [0, 1],
        ],
      },
      TOL,
    );
    expect(stats.isDiagonal).toEqual({ original: false, q: true, r: false });
    expect(stats.anyDiagonal).toBe(true);
  });

  it('reports anyDiagonal false when no matrix is diagonal', () => {
    const stats = computeStatistics(
      same([
        [1, 2],
        [3, 4],
      ]),
      TOL,
    );
    expect(stats.anyDiagonal).toBe(false);
  });
});
