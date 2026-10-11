import { describe, expect, it } from 'vitest';
import { isDiagonal } from './diagonal.service.js';

const TOL = 1e-9;

describe('isDiagonal', () => {
  it('is true when off-diagonal values are exact zeros', () => {
    expect(
      isDiagonal(
        [
          [1, 0],
          [0, 2],
        ],
        TOL,
      ),
    ).toBe(true);
  });

  it('ignores the values on the main diagonal', () => {
    expect(
      isDiagonal(
        [
          [100, 0],
          [0, -100],
        ],
        TOL,
      ),
    ).toBe(true);
  });

  it('is true when off-diagonal noise is within tolerance', () => {
    expect(
      isDiagonal(
        [
          [1, 1e-12],
          [-1e-12, 1],
        ],
        1e-9,
      ),
    ).toBe(true);
  });

  it('is false when an off-diagonal value is above tolerance', () => {
    expect(
      isDiagonal(
        [
          [1, 1e-6],
          [0, 1],
        ],
        1e-9,
      ),
    ).toBe(false);
  });

  it('treats |x| equal to the tolerance as zero', () => {
    expect(
      isDiagonal(
        [
          [1, 0.5],
          [0, 1],
        ],
        0.5,
      ),
    ).toBe(true);
    expect(
      isDiagonal(
        [
          [1, -0.5],
          [0, 1],
        ],
        0.5,
      ),
    ).toBe(true);
  });

  it('is false just above the tolerance boundary', () => {
    expect(
      isDiagonal(
        [
          [1, 0.5000001],
          [0, 1],
        ],
        0.5,
      ),
    ).toBe(false);
  });

  it('uses the absolute value, so large negatives are not diagonal', () => {
    expect(
      isDiagonal(
        [
          [1, 0],
          [-5, 1],
        ],
        TOL,
      ),
    ).toBe(false);
  });

  it('is true for a 1x1 matrix', () => {
    expect(isDiagonal([[42]], TOL)).toBe(true);
  });

  it('handles tall rectangular matrices', () => {
    expect(
      isDiagonal(
        [
          [1, 0],
          [0, 2],
          [0, 0],
        ],
        TOL,
      ),
    ).toBe(true);
    expect(
      isDiagonal(
        [
          [1, 0],
          [0, 2],
          [0, 3],
        ],
        TOL,
      ),
    ).toBe(false);
  });

  it('handles wide rectangular matrices', () => {
    expect(
      isDiagonal(
        [
          [1, 0, 0],
          [0, 2, 0],
        ],
        TOL,
      ),
    ).toBe(true);
    expect(
      isDiagonal(
        [
          [1, 0, 3],
          [0, 2, 0],
        ],
        TOL,
      ),
    ).toBe(false);
  });

  it('honours a custom tolerance', () => {
    const matrix = [
      [1, 0.01],
      [0, 1],
    ];
    expect(isDiagonal(matrix, 1e-9)).toBe(false);
    expect(isDiagonal(matrix, 0.1)).toBe(true);
  });
});
