export type ExampleId =
  'classic' | 'tall' | 'wide' | 'single' | 'diagonal' | 'ragged'

/** `id` maps to the translation key `examples.<id>`. */
export const MATRIX_EXAMPLES: { id: ExampleId; value: string }[] = [
  { id: 'classic', value: '[[12,-51,4],[6,167,-68],[-4,24,-41]]' },
  { id: 'tall', value: '[[1,2],[3,4],[5,6]]' },
  { id: 'wide', value: '[[1,2,3],[4,5,6]]' },
  { id: 'single', value: '[[7]]' },
  { id: 'diagonal', value: '[[3,0,0],[0,2,0],[0,0,1]]' },
  { id: 'ragged', value: '[[1,2,3],[4,5]]' },
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
