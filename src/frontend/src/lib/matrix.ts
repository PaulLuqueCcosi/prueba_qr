import type { Matrices, Matrix } from './types'

export type ParseResult =
  { ok: true; matrix: Matrix } | { ok: false; message: string }

/** Mirrors the backend rules (non-empty, rectangular, finite numbers) so errors show up before the request. */
export function validateMatrix(value: unknown): ParseResult {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, message: 'Matrix must be a non-empty array of rows.' }
  }
  let columns = -1
  for (const [i, row] of value.entries()) {
    if (!Array.isArray(row) || row.length === 0) {
      return { ok: false, message: `Row ${i + 1} must be a non-empty array.` }
    }
    if (columns === -1) columns = row.length
    if (row.length !== columns) {
      return {
        ok: false,
        message: `Matrix is not rectangular: row ${i + 1} has ${row.length} values, expected ${columns}.`,
      }
    }
    for (const [j, cell] of row.entries()) {
      if (typeof cell !== 'number' || !Number.isFinite(cell)) {
        return {
          ok: false,
          message: `Value at row ${i + 1}, column ${j + 1} is not a finite number.`,
        }
      }
    }
  }
  return { ok: true, matrix: value as Matrix }
}

export function parseMatrix(text: string): ParseResult {
  const parsed = parseJson(text)
  if (!parsed.ok) return parsed
  return validateMatrix(parsed.value)
}

/** Parses the `{ original, q, r }` payload used by the statistics endpoint. */
export function parseMatrices(
  text: string,
): { ok: true; matrices: Matrices } | { ok: false; message: string } {
  const parsed = parseJson(text)
  if (!parsed.ok) return parsed
  const value = parsed.value as Record<string, unknown> | null
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: 'Expected an object with original, q and r.' }
  }
  const result: Partial<Matrices> = {}
  for (const key of ['original', 'q', 'r'] as const) {
    const check = validateMatrix(value[key])
    if (!check.ok) return { ok: false, message: `"${key}": ${check.message}` }
    result[key] = check.matrix
  }
  return { ok: true, matrices: result as Matrices }
}

function parseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    const detail = e instanceof Error ? ` (${e.message})` : ''
    return { ok: false, message: `Invalid JSON${detail}` }
  }
}

/** Display only: rounds to 6 decimals; the raw value stays available in the cell's title for copying. */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(6)) + 0)
}
