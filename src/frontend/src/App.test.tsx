import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    isLoading: false,
    error: undefined,
    user: { name: 'Ada Lovelace', email: 'ada@example.test' },
    getAccessTokenSilently: () => Promise.resolve('test-token'),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  }),
}))

const config = {
  auth0Domain: 'd',
  auth0ClientId: 'c',
  auth0Audience: 'a',
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
    expect(screen.getByLabelText('Matrix as JSON')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()

    const statistics = screen.getByRole('button', { name: 'Statistics' })
    await userEvent.click(statistics)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Matrices as JSON')).toBeInTheDocument()
    expect(statistics).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('button', { name: 'API & token' }))
    expect(
      screen.getByRole('button', { name: 'Copy access token' }),
    ).toBeInTheDocument()
  })
})
