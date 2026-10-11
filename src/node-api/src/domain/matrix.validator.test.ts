import { describe, expect, it } from 'vitest';
import { InvalidMatrixError } from './invalid-matrix.error.js';
import { parseMatrices } from './matrix.validator.js';

const valid = [
  [1, 2],
  [3, 4],
];
const body = (overrides: Record<string, unknown> = {}) => ({
  matrices: { original: valid, q: valid, r: valid, ...overrides },
});

describe('parseMatrices', () => {
  it('accepts three valid matrices and returns them', () => {
    expect(parseMatrices(body())).toEqual({ original: valid, q: valid, r: valid });
  });

  it('accepts a 1x1 matrix', () => {
    expect(parseMatrices(body({ original: [[7]] })).original).toEqual([[7]]);
  });

  it('accepts tall and wide rectangular matrices', () => {
    const tall = [[1], [2], [3]];
    const wide = [[1, 2, 3]];
    const parsed = parseMatrices(body({ original: tall, q: wide }));
    expect(parsed.original).toEqual(tall);
    expect(parsed.q).toEqual(wide);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'x'],
    ['an array', []],
    ['an object without matrices', {}],
    ['matrices as an array', { matrices: [] }],
    ['matrices as null', { matrices: null }],
  ])('rejects a body that is %s', (_label, input) => {
    expect(() => parseMatrices(input)).toThrow(InvalidMatrixError);
  });

  it.each(['original', 'q', 'r'])('names the matrix "%s" when it is missing', (name) => {
    expect(() => parseMatrices(body({ [name]: undefined }))).toThrow(`"${name}"`);
  });

  it.each([
    ['empty matrix', []],
    ['not an array', 'abc'],
    ['empty first row', [[]]],
    ['first row not an array', [1, 2]],
  ])('rejects %s', (_label, matrix) => {
    expect(() => parseMatrices(body({ q: matrix }))).toThrow(InvalidMatrixError);
  });

  it('rejects ragged rows and reports the offending row', () => {
    expect(() => parseMatrices(body({ r: [[1, 2], [3]] }))).toThrow(
      /"r".*rectangular.*row 1.*2 columns/,
    );
  });

  it('rejects a row that is not an array', () => {
    expect(() => parseMatrices(body({ r: [[1, 2], 'ab'] }))).toThrow(/rectangular/);
  });

  it.each([
    ['a string', '1'],
    ['null', null],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['a boolean', true],
    ['an object', {}],
  ])('rejects %s as a cell value and reports its position', (_label, cell) => {
    expect(() =>
      parseMatrices(
        body({
          original: [
            [1, 2],
            [3, cell],
          ],
        }),
      ),
    ).toThrow(/"original".*finite numbers.*row 1, column 1/);
  });
});
