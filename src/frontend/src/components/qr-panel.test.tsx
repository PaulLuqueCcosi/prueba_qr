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
    expect(screen.getByText('Any: Yes')).toBeInTheDocument()
    expect(screen.getByText('Original (A)')).toBeInTheDocument()
    expect(screen.getByText('Total sum')).toBeInTheDocument()
  })

  it('resizes the grid and fills it with random numbers', async () => {
    render(<QrPanel config={config} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(9)

    await userEvent.click(screen.getByRole('button', { name: 'Remove row' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add column' }))
    expect(screen.getAllByRole('textbox')).toHaveLength(8)

    await userEvent.click(screen.getByRole('button', { name: 'Random' }))
    for (const cell of screen.getAllByRole('textbox')) {
      expect(Number.isInteger(Number((cell as HTMLInputElement).value))).toBe(
        true,
      )
      expect((cell as HTMLInputElement).value).not.toBe('')
    }

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    for (const cell of screen.getAllByRole('textbox')) {
      expect(cell).toHaveValue('')
    }
  })

  it('flags non-numeric cells and moves with the arrow keys', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<QrPanel config={config} />)

    const first = screen.getByLabelText('Row 1, column 1')
    await userEvent.clear(first)
    await userEvent.type(first, 'abc{ArrowDown}')
    expect(screen.getByLabelText('Row 2, column 1')).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Compute QR' }))
    expect(await screen.findByText(/not a valid number/)).toBeInTheDocument()
    expect(first).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
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
      expect(screen.getByText(/1 empty cell/)).toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
