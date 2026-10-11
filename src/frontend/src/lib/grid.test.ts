import { describe, expect, it } from 'vitest'
import {
  MAX_SIZE,
  clampSize,
  gridToMatrix,
  jsonToGrid,
  matrixToGrid,
  randomGrid,
  resizeGrid,
  sizeOverLimit,
} from './grid'

describe('gridToMatrix', () => {
  it('converts text cells to numbers', () => {
    expect(
      gridToMatrix([
        ['1', '-2.5'],
        [' 3 ', '1e2'],
      ]),
    ).toEqual({
      ok: true,
      matrix: [
        [1, -2.5],
        [3, 100],
      ],
    })
  })

  it('flags empty cells with their position', () => {
    const result = gridToMatrix([
      ['1', ''],
      ['3', '4'],
    ])
    expect(result).toMatchObject({ ok: false, invalid: [[0, 1]] })
    expect(!result.ok && result.issue).toEqual({
      key: 'issues.emptyCells',
      params: { count: 1, row: 1, column: 2 },
    })
  })

  it.each(['abc', '1,5', '-', '1.2.3', 'Infinity', '0x10'])(
    'rejects %s as not a number',
    (cell) => {
      expect(gridToMatrix([[cell]])).toMatchObject({
        ok: false,
        invalid: [[0, 0]],
        issue: { key: 'issues.invalidNumber' },
      })
    },
  )
})

describe('matrixToGrid / jsonToGrid', () => {
  it('round-trips a matrix', () => {
    const matrix = [
      [1, 2],
      [3, 4],
    ]
    expect(gridToMatrix(matrixToGrid(matrix))).toEqual({ ok: true, matrix })
  })

  it('pads ragged JSON with empty cells', () => {
    expect(jsonToGrid('[[1,2,3],[4,5]]')).toEqual([
      ['1', '2', '3'],
      ['4', '5', ''],
    ])
  })
})

describe('resizeGrid', () => {
  it('keeps existing values and fills new cells with empty text', () => {
    expect(resizeGrid([['1']], 2, 2)).toEqual([
      ['1', ''],
      ['', ''],
    ])
  })

  it('truncates and clamps to the limits', () => {
    expect(resizeGrid([['1', '2']], 1, 1)).toEqual([['1']])
    const big = resizeGrid([['1']], 999, 0)
    expect(big).toHaveLength(100)
    expect(big[0]).toHaveLength(1)
    expect(clampSize(-3)).toBe(1)
  })
})

describe('randomGrid', () => {
  it('produces integers within the range for the requested shape', () => {
    const grid = randomGrid(3, 4)
    expect(grid).toHaveLength(3)
    for (const row of grid) {
      expect(row).toHaveLength(4)
      for (const cell of row) {
        const n = Number(cell)
        expect(Number.isInteger(n)).toBe(true)
        expect(n).toBeGreaterThanOrEqual(-9)
        expect(n).toBeLessThanOrEqual(9)
      }
    }
  })

  it('hits both ends of the range with an injected generator', () => {
    expect(randomGrid(1, 1, () => 0)).toEqual([['-9']])
    expect(randomGrid(1, 1, () => 0.999999)).toEqual([['9']])
  })
})

describe('sizeOverLimit', () => {
  it('returns null for a matrix within the cap', () => {
    expect(sizeOverLimit([[1, 2]])).toBeNull()
    const atLimit = Array.from({ length: MAX_SIZE }, () =>
      Array.from({ length: MAX_SIZE }, () => 0),
    )
    expect(sizeOverLimit(atLimit)).toBeNull()
  })

  it('returns the shape when rows or columns exceed the cap', () => {
    const tooWide = [Array.from({ length: MAX_SIZE + 1 }, () => 0)]
    expect(sizeOverLimit(tooWide)).toEqual([1, MAX_SIZE + 1])
    const tooTall = Array.from({ length: MAX_SIZE + 1 }, () => [0])
    expect(sizeOverLimit(tooTall)).toEqual([MAX_SIZE + 1, 1])
  })
})
