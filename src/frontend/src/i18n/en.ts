/** Source of truth for the translation shape: `es.ts` must match these keys exactly. */
export const en = {
  app: {
    name: 'Matrix QR',
    tagline: 'QR factorization tools',
    signIn: 'Sign in',
    loginError: 'Login error',
    loading: 'Loading',
    toggleSidebar: 'Toggle sidebar',
  },
  signIn: {
    tagline: 'Compute QR factorization and matrix statistics',
    secureHint:
      'Secure sign-in with Logto, you will be redirected and brought back',
    waiting: 'Redirecting you to the secure sign-in page...',
    waitingShort: 'Redirecting...',
    errorTitle: 'Sign-in problem',
    failed: 'We could not start the sign-in. Please try again.',
  },
  callback: {
    completing: 'Completing sign-in...',
    failedTitle: 'Sign-in problem',
    failed: 'We could not complete the sign-in. Please try again.',
    back: 'Back to start',
  },
  sidebar: {
    tools: 'Tools',
    developer: 'Developer',
    login: 'Login',
    logout: 'Logout',
  },
  views: {
    qr: {
      label: 'QR factorization',
      title: 'QR factorization',
      description: 'Q is orthogonal, R is upper triangular, and A = Q·R.',
    },
    statistics: {
      label: 'Statistics',
      title: 'Statistics',
      description:
        'Max, min, average, sum and diagonal checks over three matrices.',
    },
    health: {
      label: 'API health',
      title: 'API health',
      description: 'Status and latency of go-api and node-api.',
    },
    developer: {
      label: 'API & token',
      title: 'API & token',
      description:
        'Inspect or copy the ID token (the Bearer token) to test the APIs by hand.',
    },
  },
  qr: {
    inputTitle: 'Input matrix',
    inputDescription:
      'Sent to {{url}}/api/v1/qr. Edit the cells, pick an example or fill it randomly.',
    random: 'Random',
    clear: 'Clear',
    examples: 'Examples',
    compute: 'Compute QR',
    computing: 'Computing...',
    statisticsTitle: 'Statistics',
    statisticsDescription:
      'Computed over the original matrix, Q and R together.',
    matricesTitle: 'Matrices',
    matricesDescription: 'A = Q·R, with Q orthogonal and R upper triangular.',
    qCaption: 'Orthogonal: Qᵀ·Q = I.',
    rCaption: 'Upper triangular.',
    originalTitle: 'Original (A)',
    originalCaption: 'The matrix you sent.',
  },
  examples: {
    classic: 'Classic 3x3',
    tall: 'Tall 3x2',
    wide: 'Wide 2x3',
    single: '1x1',
    diagonal: 'Diagonal',
    ragged: 'Invalid (ragged)',
  },
  grid: {
    rows: 'Rows',
    columns: 'Columns',
    addRow: 'Add row',
    removeRow: 'Remove row',
    addColumn: 'Add column',
    removeColumn: 'Remove column',
    matrixValues: 'Matrix values',
    cell: 'Row {{row}}, column {{column}}',
    size: '{{rows}}x{{columns}}',
    sizeHint: 'Up to {{max}}x{{max}} (a frontend limit, not the APIs).',
    pasteJson: 'Paste JSON',
    pasteJsonTitle: 'Load matrix from JSON',
    pasteJsonDescription:
      'Paste a matrix as a JSON array of rows, e.g. [[1,2],[3,4]]. Handy for large matrices.',
    pasteJsonPlaceholder: '[[1,2],[3,4]]',
    loadJson: 'Load',
    cancel: 'Cancel',
  },
  statisticsPanel: {
    inputTitle: 'Input matrices',
    inputDescription:
      'Sent straight to {{url}}/api/v1/statistics, without going through go-api.',
    label: 'Matrices as JSON',
    hint: 'Object with original, q and r. The API does not check that Q·R equals the original.',
    compute: 'Compute statistics',
    resultTitle: 'Result',
    resultDescription: 'Computed over the three matrices together.',
  },
  stats: {
    max: 'Max',
    min: 'Min',
    average: 'Average',
    sum: 'Total sum',
    diagonalQuestion: 'Diagonal matrix?',
    original: 'Original',
    any: 'Any',
    yes: 'Yes',
    no: 'No',
    badge: '{{name}}: {{answer}}',
  },
  matrixTable: {
    copyJson: 'Copy JSON',
    copyAria: 'Copy {{title}} as JSON',
  },
  health: {
    title: 'API health',
    description: 'Calls GET /health on each API directly from the browser.',
    checking: 'Checking',
    ok: 'OK',
    down: 'Down',
    checkAgain: 'Check again',
    latency: '{{ms}} ms',
    http: 'HTTP {{status}}',
    timeout: 'Timed out after {{ms}} ms',
    unreachable: 'Unreachable',
  },
  developer: {
    title: 'ID token',
    description:
      'Copy a fresh token to call the APIs from Postman or Swagger. The token itself is never displayed.',
    copy: 'Copy ID token',
    showClaims: 'Show claims',
    couldNotGet: 'Could not get the ID token.',
    copied: 'ID token copied to the clipboard.',
    couldNotCopy: 'Could not copy the ID token.',
    unknown: 'unknown',
    expired: 'expired',
    secondsLeft: '{{seconds}}s left',
  },
  configError: {
    title: 'Missing configuration',
    body: 'Set these variables in .env.local (see .env.example) and restart the dev server:',
  },
  errors: {
    renderTitle: 'Could not display the results',
    renderBody:
      'Something went wrong while showing this result. Your data is safe: try again.',
    renderRetry: 'Try again',
    clientValidation: 'Invalid input',
    serverMessage: 'Server message',
    titles: {
      '0': 'Cannot reach the API',
      '400': 'Bad request',
      '401': 'Unauthorized',
      '403': 'Forbidden',
      '413': 'Payload too large',
      '422': 'Invalid matrix',
      '502': 'Upstream unavailable',
      default: 'Error',
    },
    codes: {
      NETWORK_ERROR:
        'Cannot reach the API. Is it running, and does CORS allow this origin?',
      TOKEN_ERROR: 'Could not get the ID token. Try logging out and in again.',
      INVALID_JSON: 'The request body is not valid JSON.',
      INVALID_MATRIX: 'The matrix is invalid.',
      PAYLOAD_TOO_LARGE: 'Payload too large.',
      UPSTREAM_UNAVAILABLE: 'The upstream API (node-api) is unavailable.',
      INTERNAL_ERROR: 'Internal server error.',
      NOT_FOUND: 'Route not found.',
      NON_FINITE_RESULT: 'The result contains non-finite numbers.',
    },
    fallback: {
      '400': 'Malformed request (invalid JSON).',
      '401': 'Unauthorized: the token is missing, invalid or expired.',
      '403': 'Forbidden: access denied.',
      '413': 'Payload too large.',
      '422': 'The matrix is invalid.',
      '502': 'The upstream API (node-api) is unavailable.',
      default: 'Unexpected response ({{status}}).',
    },
  },
  issues: {
    invalidJson: 'Invalid JSON{{detail}}',
    emptyMatrix: 'Matrix must be a non-empty array of rows.',
    emptyRow: 'Row {{row}} must be a non-empty array.',
    notRectangular:
      'Matrix is not rectangular: row {{row}} has {{actual}} values, expected {{expected}}.',
    notFinite:
      'Value at row {{row}}, column {{column}} is not a finite number.',
    expectedObject: 'Expected an object with original, q and r.',
    emptyCells_one:
      '{{count}} empty cell: fill it in (at row {{row}}, column {{column}}).',
    emptyCells_other:
      '{{count}} empty cells: fill them in (first one at row {{row}}, column {{column}}).',
    invalidNumber:
      'Value at row {{row}}, column {{column}} is not a valid number. Use digits with an optional sign or decimal point.',
    tooLarge:
      'Matrix is {{rows}}x{{columns}}, over the {{max}}x{{max}} frontend limit. The APIs have no such limit; raise it in src/lib/grid.ts if you need more.',
  },
  language: {
    label: 'Language',
    en: 'English',
    es: 'Español',
  },
  theme: {
    label: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },
}

export type Translation = typeof en
