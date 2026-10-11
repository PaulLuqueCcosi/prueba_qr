import { InvalidMatrixError } from './invalid-matrix.error.js';
import type { Matrices, Matrix } from './matrix.types.js';

export function parseMatrices(body: unknown): Matrices {
  const matrices = isRecord(body) ? body['matrices'] : undefined;
  if (!isRecord(matrices)) {
    throw new InvalidMatrixError('Body must be an object with a "matrices" object');
  }

  return {
    original: parseMatrix('original', matrices['original']),
    q: parseMatrix('q', matrices['q']),
    r: parseMatrix('r', matrices['r']),
  };
}

function parseMatrix(name: string, value: unknown): Matrix {
  if (!Array.isArray(value) || value.length === 0) {
    throw new InvalidMatrixError(`Matrix "${name}" must be a non-empty array of rows`);
  }

  const columns = Array.isArray(value[0]) ? value[0].length : 0;
  if (columns === 0) {
    throw new InvalidMatrixError(`Matrix "${name}" must have non-empty rows`);
  }

  for (const [i, row] of value.entries()) {
    if (!Array.isArray(row) || row.length !== columns) {
      throw new InvalidMatrixError(
        `Matrix "${name}" must be rectangular: row ${i} does not have ${columns} columns`,
      );
    }
    for (const [j, cell] of row.entries()) {
      if (typeof cell !== 'number' || !Number.isFinite(cell)) {
        throw new InvalidMatrixError(
          `Matrix "${name}" must contain only finite numbers: invalid value at row ${i}, column ${j}`,
        );
      }
    }
  }

  return value as Matrix;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
