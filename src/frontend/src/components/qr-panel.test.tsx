import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QrPanel } from './qr-panel'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    getAccessTokenSilently: () => Promise.resolve('test-token'),
  }),
}))

const config = {
  auth0Domain: 'd',
  auth0ClientId: 'c',
  auth0Audience: 'a',
  goApiUrl: 'http://go.test',
  nodeApiUrl: 'http://node.test',
}

afterEach(() => vi.unstubAllGlobals())

describe('QrPanel', () => {
  it('renders matrices and statistics from the API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              original: [
                [3, 0],
                [0, 2],
              ],
              q: [
                [1, 0],
                [0, 1],
              ],
              r: [
                [3, 0],
                [0, 2],
              ],
              statistics: {
                max: 3,
                min: 0,
                average: 1.25,
                sum: 10,
                isDiagonal: { original: true, q: true, r: true },
                anyDiagonal: true,
              },
            }),
            { status: 200 },
          ),
        ),
      ),
    )

    render(<QrPanel config={config} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compute QR' }))

    expect(await screen.findByText('Average')).toBeInTheDocument()
    expect(screen.getByText('1.25')).toBeInTheDocument()
    expect(screen.getByText('Any: yes')).toBeInTheDocument()
    expect(screen.getByText('Original (A)')).toBeInTheDocument()
  })

  it('shows a client-side error without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<QrPanel config={config} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Invalid (ragged)' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Compute QR' }))

    await waitFor(() =>
      expect(screen.getByText(/not rectangular/)).toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
