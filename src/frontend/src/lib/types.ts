export type Matrix = number[][]

export interface Statistics {
  max: number
  min: number
  average: number
  sum: number
  isDiagonal: { original: boolean; q: boolean; r: boolean }
  anyDiagonal: boolean
}

export interface QrResponse {
  original: Matrix
  q: Matrix
  r: Matrix
  statistics: Statistics
}

export interface Matrices {
  original: Matrix
  q: Matrix
  r: Matrix
}
