import type { Statistics } from '../../../domain/matrix.types.js';

export interface CalculateStatisticsPort {
  /**
   * Takes untrusted input on purpose: validation is a business rule owned by the
   * application, so every driving adapter gets the same behavior.
   * @throws InvalidMatrixError when the input is not a valid set of matrices.
   */
  execute(input: unknown): Statistics;
}
