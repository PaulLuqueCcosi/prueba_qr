import { describe, expect, it } from 'vitest'
import { formatNumber, parseMatrices, parseMatrix } from './matrix'

describe('parseMatrix', () => {
  it('accepts a rectangular numeric matrix', () => {
    expect(parseMatrix('[[1,2],[3,4],[5,6]]')).toEqual({
      ok: true,
      matrix: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    })
  })

  it('rejects a ragged matrix and names the row', () => {
    const result = parseMatrix('[[1,2,3],[4,5]]')
    expect(result).toMatchObject({ ok: false })
    expect(!result.ok && result.message).toContain('row 2')
  })

  it.each(['[]', '[[]]', '{}', '5'])(
    'rejects empty or non-matrix input %s',
    (text) => {
      expect(parseMatrix(text).ok).toBe(false)
    },
  )

  it('rejects non-numeric values', () => {
    expect(parseMatrix('[[1,"a"]]').ok).toBe(false)
    expect(parseMatrix('[[1,null]]').ok).toBe(false)
  })

  it('reports invalid JSON', () => {
    const result = parseMatrix('[[1,2')
    expect(!result.ok && result.message).toMatch(/Invalid JSON/)
  })
})

describe('parseMatrices', () => {
  it('requires original, q and r', () => {
    const result = parseMatrices('{"original":[[1]],"q":[[1]]}')
    expect(!result.ok && result.message).toContain('"r"')
  })

  it('accepts a complete payload', () => {
    expect(parseMatrices('{"original":[[1]],"q":[[1]],"r":[[1]]}').ok).toBe(
      true,
    )
  })
})

describe('formatNumber', () => {
  it('rounds for display and avoids negative zero', () => {
    expect(formatNumber(0.1234567891)).toBe('0.123457')
    expect(formatNumber(-0)).toBe('0')
  })
})
