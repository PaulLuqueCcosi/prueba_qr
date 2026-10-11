import { describe, expect, it } from 'vitest';
import { InvalidMatrixError } from '../../domain/invalid-matrix.error.js';
import { CalculateStatisticsUseCase } from './calculate-statistics.use-case.js';

const input = {
  matrices: {
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
};

describe('CalculateStatisticsUseCase', () => {
  it('returns the statistics for valid matrices', () => {
    const result = new CalculateStatisticsUseCase(1e-9).execute(input);
    expect(result).toEqual({
      max: 7,
      min: 0,
      average: 30 / 12,
      sum: 30,
      isDiagonal: { original: false, q: true, r: false },
      anyDiagonal: true,
    });
  });

  it('throws InvalidMatrixError naming the offending matrix', () => {
    const bad = { matrices: { ...input.matrices, q: [[1, 2], [3]] } };
    const useCase = new CalculateStatisticsUseCase(1e-9);
    expect(() => useCase.execute(bad)).toThrow(InvalidMatrixError);
    expect(() => useCase.execute(bad)).toThrow(/Matrix "q"/);
  });

  it('throws InvalidMatrixError for a body without matrices', () => {
    expect(() => new CalculateStatisticsUseCase(1e-9).execute({})).toThrow(InvalidMatrixError);
  });

  it('uses the injected tolerance for the diagonal check', () => {
    const noisy = {
      matrices: {
        ...input.matrices,
        original: [
          [1, 0.01],
          [0, 1],
        ],
      },
    };
    expect(new CalculateStatisticsUseCase(1e-9).execute(noisy).isDiagonal.original).toBe(false);
    expect(new CalculateStatisticsUseCase(0.1).execute(noisy).isDiagonal.original).toBe(true);
  });

  it('sets anyDiagonal to false when no matrix is diagonal', () => {
    const m = [
      [1, 2],
      [3, 4],
    ];
    const result = new CalculateStatisticsUseCase(1e-9).execute({
      matrices: { original: m, q: m, r: m },
    });
    expect(result.anyDiagonal).toBe(false);
  });
});
