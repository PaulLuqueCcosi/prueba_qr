import type { Issue } from './issue'
import type { Matrix } from './types'

/** Cells are kept as text so the user can type "-" or "1." without the input fighting back. */
export type Grid = string[][]

export const MIN_SIZE = 1
export const MAX_SIZE = 10

export type GridResult =
  | { ok: true; matrix: Matrix }
  | { ok: false; issue: Issue; invalid: [number, number][] }

const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

export function clampSize(n: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.trunc(n)))
}

export function createGrid(rows: number, columns: number): Grid {
  return Array.from({ length: rows }, () => Array<string>(columns).fill(''))
}

export function matrixToGrid(matrix: Matrix): Grid {
  return matrix.map((row) => row.map(String))
}

/**
 * Loads a JSON example into the grid. Ragged rows are padded with empty cells
 * (instead of failing) so the grid shows exactly which cells are missing.
 */
export function jsonToGrid(text: string): Grid {
  const parsed: unknown = JSON.parse(text)
  const rows = (parsed as unknown[][]).map((row) => row.map(String))
  const columns = Math.max(...rows.map((row) => row.length))
  return rows.map((row) => [
    ...row,
    ...Array<string>(columns - row.length).fill(''),
  ])
}

/** Grows (with empty cells) or truncates the grid to the requested size, within limits. */
export function resizeGrid(grid: Grid, rows: number, columns: number): Grid {
  const r = clampSize(rows)
  const c = clampSize(columns)
  return Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => grid[i]?.[j] ?? ''),
  )
}

/** Random integers keep results easy to read; `random` is injectable for tests. */
export function randomGrid(
  rows: number,
  columns: number,
  random: () => number = Math.random,
  min = -9,
  max = 9,
): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () =>
      String(min + Math.floor(random() * (max - min + 1))),
    ),
  )
}

/** Converts the text grid into numbers, reporting every empty or non-numeric cell. */
export function gridToMatrix(grid: Grid): GridResult {
  const empty: [number, number][] = []
  const bad: [number, number][] = []
  const matrix: Matrix = grid.map((row, i) =>
    row.map((cell, j) => {
      const text = cell.trim()
      if (text === '') empty.push([i, j])
      else if (!NUMBER_PATTERN.test(text) || !Number.isFinite(Number(text)))
        bad.push([i, j])
      return Number(text)
    }),
  )
  if (empty.length > 0) {
    return {
      ok: false,
      issue: {
        key: 'issues.emptyCells',
        params: {
          count: empty.length,
          row: empty[0][0] + 1,
          column: empty[0][1] + 1,
        },
      },
      invalid: [...empty, ...bad],
    }
  }
  if (bad.length > 0) {
    return {
      ok: false,
      issue: {
        key: 'issues.invalidNumber',
        params: { row: bad[0][0] + 1, column: bad[0][1] + 1 },
      },
      invalid: bad,
    }
  }
  return { ok: true, matrix }
}
