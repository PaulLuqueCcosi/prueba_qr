import type { Issue } from './issue'
import type { Matrices, Matrix } from './types'

export type ParseResult =
  { ok: true; matrix: Matrix } | { ok: false; issue: Issue }

/** Mirrors the backend rules (non-empty, rectangular, finite numbers) so errors show up before the request. */
export function validateMatrix(value: unknown): ParseResult {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, issue: { key: 'issues.emptyMatrix' } }
  }
  let columns = -1
  for (const [i, row] of value.entries()) {
    if (!Array.isArray(row) || row.length === 0) {
      return {
        ok: false,
        issue: { key: 'issues.emptyRow', params: { row: i + 1 } },
      }
    }
    if (columns === -1) columns = row.length
    if (row.length !== columns) {
      return {
        ok: false,
        issue: {
          key: 'issues.notRectangular',
          params: { row: i + 1, actual: row.length, expected: columns },
        },
      }
    }
    for (const [j, cell] of row.entries()) {
      if (typeof cell !== 'number' || !Number.isFinite(cell)) {
        return {
          ok: false,
          issue: {
            key: 'issues.notFinite',
            params: { row: i + 1, column: j + 1 },
          },
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
): { ok: true; matrices: Matrices } | { ok: false; issue: Issue } {
  const parsed = parseJson(text)
  if (!parsed.ok) return parsed
  const value = parsed.value as Record<string, unknown> | null
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, issue: { key: 'issues.expectedObject' } }
  }
  const result: Partial<Matrices> = {}
  for (const key of ['original', 'q', 'r'] as const) {
    const check = validateMatrix(value[key])
    if (!check.ok) return { ok: false, issue: { ...check.issue, field: key } }
    result[key] = check.matrix
  }
  return { ok: true, matrices: result as Matrices }
}

function parseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; issue: Issue } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    const detail = e instanceof Error ? ` (${e.message})` : ''
    return {
      ok: false,
      issue: { key: 'issues.invalidJson', params: { detail } },
    }
  }
}

/** Display only: rounds to 6 decimals; the raw value stays available in the cell's title for copying. */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(6)) + 0)
}
