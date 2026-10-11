import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HealthPanel } from './health-panel'

const config = {
  auth0Domain: 'd',
  auth0ClientId: 'c',
  auth0Audience: 'a',
  goApiUrl: 'http://go.test',
  nodeApiUrl: 'http://node.test',
}

afterEach(() => vi.unstubAllGlobals())

describe('HealthPanel', () => {
  it('checks on mount, shows per-API status and re-checks on demand', async () => {
    const fetchMock = vi.fn((url: string) =>
      url.startsWith('http://go.test')
        ? Promise.resolve(new Response('{"status":"ok"}'))
        : Promise.reject(new TypeError('Failed to fetch')),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<HealthPanel config={config} />)

    expect(await screen.findByText('OK')).toBeInTheDocument()
    expect(await screen.findByText('Down')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole('button', { name: 'Check again' }))
    await screen.findByText('Down')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
