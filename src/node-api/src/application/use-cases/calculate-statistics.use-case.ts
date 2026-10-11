import { parseMatrices } from '../../domain/matrix.validator.js';
import { computeStatistics } from '../../domain/statistics.service.js';
import type { Statistics } from '../../domain/matrix.types.js';
import type { CalculateStatisticsPort } from '../ports/inbound/calculate-statistics.port.js';

export class CalculateStatisticsUseCase implements CalculateStatisticsPort {
  private readonly diagonalTolerance: number;

  constructor(diagonalTolerance: number) {
    this.diagonalTolerance = diagonalTolerance;
  }

  execute(input: unknown): Statistics {
    return computeStatistics(parseMatrices(input), this.diagonalTolerance);
  }
}
