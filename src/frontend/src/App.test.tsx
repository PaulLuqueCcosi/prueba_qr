import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from './App'

const jwt = vi.hoisted(() => {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  // exp far in the future, so the hook does not try to refresh.
  return { fresh: `${b64({ alg: 'ES384' })}.${b64({ exp: 4102444800 })}.sig` }
})

vi.mock('@logto/react', () => ({
  useLogto: () => ({
    isAuthenticated: true,
    isLoading: false,
    error: undefined,
    getIdTokenClaims: () =>
      Promise.resolve({ name: 'Ada Lovelace', email: 'ada@example.test' }),
    getIdToken: () => Promise.resolve(jwt.fresh),
    getAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  useHandleSignInCallback: vi.fn(),
}))

const config = {
  logtoEndpoint: 'https://logto.test',
  logtoAppId: 'app',
  goApiUrl: 'http://go.test',
  nodeApiUrl: 'http://node.test',
}

beforeAll(() => {
  // jsdom has no matchMedia; the sidebar uses it to detect mobile.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
})

describe('App navigation', () => {
  it('switches views from the sidebar and marks the active item', async () => {
    render(<App config={config} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'QR factorization' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Matrix values' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()

    const statistics = screen.getByRole('button', { name: 'Statistics' })
    await userEvent.click(statistics)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Matrices as JSON')).toBeInTheDocument()
    expect(statistics).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('button', { name: 'API & token' }))
    expect(
      screen.getByRole('button', { name: 'Copy ID token' }),
    ).toBeInTheDocument()
  })
})
