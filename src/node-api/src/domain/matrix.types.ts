export type Matrix = number[][];

export interface Matrices {
  original: Matrix;
  q: Matrix;
  r: Matrix;
}

export interface Statistics {
  max: number;
  min: number;
  average: number;
  sum: number;
  isDiagonal: { original: boolean; q: boolean; r: boolean };
  anyDiagonal: boolean;
}
