import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const logto = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  signIn: vi.fn(),
  callbackResult: {} as { error?: Error },
  onCallbackDone: undefined as undefined | (() => void),
}))

vi.mock('@logto/react', () => ({
  useLogto: () => ({
    isAuthenticated: false,
    isLoading: false,
    error: undefined,
    signIn: logto.signIn,
    signOut: vi.fn(),
    getIdTokenClaims: vi.fn(),
    getAccessToken: vi.fn(),
    ...logto.state,
  }),
  useHandleSignInCallback: (done?: () => void) => {
    logto.onCallbackDone = done
    return { isLoading: false, isAuthenticated: false, ...logto.callbackResult }
  },
}))

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

beforeEach(() => {
  logto.state = {}
  logto.callbackResult = {}
  logto.onCallbackDone = undefined
  logto.signIn.mockReset()
  window.history.replaceState(null, '', '/')
})

const cardButton = () => screen.getAllByRole('button', { name: /sign in/i })[0]

describe('sign-in (redirect)', () => {
  it('starts the redirect flow with the /callback URI and shows a waiting state', async () => {
    logto.signIn.mockReturnValue(new Promise(() => {})) // the browser leaves the page
    render(<App config={config} />)
    await userEvent.click(cardButton())

    expect(logto.signIn).toHaveBeenCalledWith(
      `${window.location.origin}/callback`,
    )
    expect(
      screen.getByText('Redirecting you to the secure sign-in page...'),
    ).toBeInTheDocument()
    // Disabled so a second click cannot start a second flow.
    expect(
      screen.getByRole('button', { name: 'Redirecting...' }),
    ).toBeDisabled()
  })

  it('shows a friendly error and allows retrying when starting fails', async () => {
    logto.signIn.mockRejectedValueOnce(new Error('network'))
    render(<App config={config} />)
    await userEvent.click(cardButton())

    expect(
      await screen.findByText(/could not start the sign-in/),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Sign in' })[0]).toBeEnabled()

    logto.signIn.mockReturnValue(new Promise(() => {}))
    await userEvent.click(cardButton())
    expect(logto.signIn).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(/could not start the sign-in/)).toBeNull()
  })

  it('shows the secure sign-in hint on the landing', () => {
    render(<App config={config} />)
    expect(screen.getByText(/Secure sign-in with Logto/)).toBeInTheDocument()
  })
})

describe('/callback', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/callback?code=abc&state=xyz')
  })

  it('shows progress while the code is exchanged, then clears the URL and moves on', () => {
    render(<App config={config} />)
    expect(screen.getByText('Completing sign-in...')).toBeInTheDocument()

    act(() => logto.onCallbackDone?.())

    expect(window.location.pathname).toBe('/')
    expect(window.location.search).toBe('')
    expect(screen.queryByText('Completing sign-in...')).toBeNull()
    expect(cardButton()).toBeInTheDocument()
  })

  it('shows an error with a way back when the exchange fails', async () => {
    logto.callbackResult = { error: new Error('bad code') }
    render(<App config={config} />)

    expect(
      screen.getByText(/could not complete the sign-in/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to start' }))

    expect(window.location.pathname).toBe('/')
    expect(cardButton()).toBeInTheDocument()
  })
})
