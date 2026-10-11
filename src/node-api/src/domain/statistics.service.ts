import { isDiagonal } from './diagonal.service.js';
import type { Matrices, Statistics } from './matrix.types.js';

export function computeStatistics(matrices: Matrices, diagonalTolerance: number): Statistics {
  let max = -Infinity;
  let min = Infinity;
  let count = 0;
  // Neumaier compensated sum: cheap, and keeps error low when QR values mix magnitudes.
  let sum = 0;
  let compensation = 0;

  // Plain loops: spreading big arrays into Math.max/min overflows the call stack.
  for (const matrix of [matrices.original, matrices.q, matrices.r]) {
    for (const row of matrix) {
      for (const value of row) {
        if (value > max) max = value;
        if (value < min) min = value;
        const total = sum + value;
        compensation +=
          Math.abs(sum) >= Math.abs(value) ? sum - total + value : value - total + sum;
        sum = total;
        count++;
      }
    }
  }
  sum += compensation;

  const diagonal = {
    original: isDiagonal(matrices.original, diagonalTolerance),
    q: isDiagonal(matrices.q, diagonalTolerance),
    r: isDiagonal(matrices.r, diagonalTolerance),
  };

  return {
    max,
    min,
    average: sum / count,
    sum,
    isDiagonal: diagonal,
    anyDiagonal: diagonal.original || diagonal.q || diagonal.r,
  };
}
