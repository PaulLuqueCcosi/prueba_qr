import type { Matrix } from './matrix.types.js';

/**
 * A matrix is diagonal when every element off the main diagonal (row !== column)
 * satisfies |x| <= tolerance. The rule applies to rectangular matrices too, because
 * QR's R is m x n. The tolerance absorbs floating-point noise from the factorization,
 * which would otherwise make exact-zero checks fail on mathematically diagonal results.
 */
export function isDiagonal(matrix: Matrix, tolerance: number): boolean {
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!;
    for (let j = 0; j < row.length; j++) {
      if (i !== j && Math.abs(row[j]!) > tolerance) return false;
    }
  }
  return true;
}
