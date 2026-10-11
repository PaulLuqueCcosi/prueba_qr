export const MATRIX_EXAMPLES: { label: string; value: string }[] = [
  { label: 'Classic 3x3', value: '[[12,-51,4],[6,167,-68],[-4,24,-41]]' },
  { label: 'Tall 3x2', value: '[[1,2],[3,4],[5,6]]' },
  { label: 'Wide 2x3', value: '[[1,2,3],[4,5,6]]' },
  { label: '1x1', value: '[[7]]' },
  { label: 'Diagonal', value: '[[3,0,0],[0,2,0],[0,0,1]]' },
  { label: 'Invalid (ragged)', value: '[[1,2,3],[4,5]]' },
]

/** Any consistent set of matrices works: node-api does not re-check that Q*R = A. */
export const STATISTICS_EXAMPLE = JSON.stringify(
  {
    original: [
      [1, 2],
      [3, 4],
    ],
    q: [
      [-0.316228, -0.948683],
      [-0.948683, 0.316228],
    ],
    r: [
      [-3.162278, -4.427189],
      [0, -0.632456],
    ],
  },
  null,
  2,
)
