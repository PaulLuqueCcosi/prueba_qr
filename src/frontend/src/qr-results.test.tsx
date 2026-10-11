import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import App from './App'

const jwt = vi.hoisted(() => {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  return { fresh: `${b64({ alg: 'ES384' })}.${b64({ exp: 4102444800 })}.sig` }
})

// Mirrors the real @logto/react: every token call flips the shared `isLoading`
// flag on and back off (see useLogto's `proxy`), which re-renders the whole app.
vi.mock('@logto/react', async () => {
  const { useSyncExternalStore } = await import('react')
  let loading = false
  const listeners = new Set<() => void>()
  const setLoading = (value: boolean) => {
    loading = value
    listeners.forEach((listener) => listener())
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  const withLoading =
    <T,>(value: T) =>
    async () => {
      setLoading(true)
      await Promise.resolve()
      setLoading(false)
      return value
    }
  const methods = {
    getIdToken: withLoading(jwt.fresh),
    getIdTokenClaims: withLoading({ name: 'Ada', email: 'ada@example.test' }),
    getAccessToken: withLoading('opaque'),
    clearAccessToken: withLoading(undefined),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
  return {
    useLogto: () => ({
      isAuthenticated: true,
      isLoading: useSyncExternalStore(subscribe, () => loading),
      error: undefined,
      ...methods,
    }),
    useHandleSignInCallback: vi.fn(),
  }
})

const config = {
  logtoEndpoint: 'https://logto.test',
  logtoAppId: 'app',
  goApiUrl: 'http://go.test',
  nodeApiUrl: 'http://node.test',
}

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

afterEach(() => vi.unstubAllGlobals())

/** Same JSON shape go-api returns (see dto.go): original, q, r, statistics. */
function qrResponse(
  original: number[][],
  q: number[][],
  r: number[][],
  statistics: object,
) {
  return new Response(JSON.stringify({ original, q, r, statistics }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function submit() {
  render(<App config={config} />)
  // The profile fetch also flips the loading flag, so wait for the panel to appear.
  await userEvent.click(
    await screen.findByRole('button', { name: 'Compute QR' }),
  )
}

function table(name: RegExp) {
  const heading = screen.getByRole('heading', { name })
  return within(heading.closest('div.min-w-0') as HTMLElement).getByRole(
    'table',
  )
}

describe('QR results survive the SDK loading flag', () => {
  it('shows Q, R, the four statistics and the diagonal badges for the classic 3x3', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          qrResponse(
            [
              [12, -51, 4],
              [6, 167, -68],
              [-4, 24, -41],
            ],
            [
              [-0.8571428571428571, 0.3942857142857143, 0.3314285714285714],
              [-0.4285714285714286, -0.9028571428571428, -0.0342857142857143],
              [0.2857142857142857, -0.1714285714285714, 0.9428571428571428],
            ],
            [
              [-14, -21, 14],
              [0, -175, 70],
              [0, 0, -35],
            ],
            {
              max: 167,
              min: -175,
              average: 1.2345679012345678,
              sum: 33.333333333333336,
              isDiagonal: { original: false, q: false, r: false },
              anyDiagonal: false,
            },
          ),
        ),
      ),
    )
    await submit()

    // The whole page flips to a skeleton while a token is fetched; results must still arrive.
    expect(await screen.findByText('Total sum')).toBeInTheDocument()
    for (const label of ['Max', 'Min', 'Average', 'Total sum']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('167').length).toBeGreaterThan(0)
    expect(screen.getAllByText('-175').length).toBeGreaterThan(0)
    expect(screen.getByText('1.234568')).toBeInTheDocument()
    expect(screen.getByText('33.333333')).toBeInTheDocument()
    expect(screen.getByText('Q: No')).toBeInTheDocument()
    expect(screen.getByText('R: No')).toBeInTheDocument()
    expect(screen.getByText('Any: No')).toBeInTheDocument()
    expect(within(table(/^Q /)).getAllByRole('row')).toHaveLength(3)
    expect(within(table(/^R /)).getByText('-175')).toBeInTheDocument()
  })

  it('handles a 2x2 diagonal matrix (including -0 and tiny float noise)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          qrResponse(
            [
              [3, 0],
              [0, 2],
            ],
            [
              [1, -0],
              [0, 1],
            ],
            [
              [3, 0],
              [0, 2.000000000000001],
            ],
            {
              max: 3,
              min: 0,
              average: 1.25,
              sum: 10,
              isDiagonal: { original: true, q: true, r: true },
              anyDiagonal: true,
            },
          ),
        ),
      ),
    )
    await submit()

    expect(await screen.findByText('Any: Yes')).toBeInTheDocument()
    expect(screen.getByText('Q: Yes')).toBeInTheDocument()
    expect(screen.getByText('1.25')).toBeInTheDocument()
  })

  it('handles a tall 3x2 matrix (Q is 3x3, R is 3x2)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          qrResponse(
            [
              [1, 2],
              [3, 4],
              [5, 6],
            ],
            [
              [-0.169, 0.897, 0.408],
              [-0.507, 0.276, -0.816],
              [-0.845, -0.345, 0.408],
            ],
            [
              [-5.916, -7.437],
              [0, 0.828],
              [0, 0],
            ],
            {
              max: 6,
              min: -7.437,
              average: -0.1,
              sum: -1.8,
              isDiagonal: { original: false, q: false, r: false },
              anyDiagonal: false,
            },
          ),
        ),
      ),
    )
    await submit()

    expect(await screen.findByText('Total sum')).toBeInTheDocument()
    expect(within(table(/^Q /)).getAllByRole('row')).toHaveLength(3)
    expect(within(table(/^R /)).getAllByRole('row')).toHaveLength(3)
    expect(
      screen.getByRole('heading', { name: /^Q\s*\(3x3\)/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^R\s*\(3x2\)/ }),
    ).toBeInTheDocument()
  })

  it('shows a friendly translated error, not a blank page, if rendering the results throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    // A malformed response (no statistics.isDiagonal) makes StatisticsView throw.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(qrResponse([[1]], [[1]], [[1]], { max: 1 }))),
    )
    await submit()

    expect(
      await screen.findByText('Could not display the results'),
    ).toBeInTheDocument()
    // The input form is still there, so the user can retry.
    expect(
      screen.getByRole('button', { name: 'Compute QR' }),
    ).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
