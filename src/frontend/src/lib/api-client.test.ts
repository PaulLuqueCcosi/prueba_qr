import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from './api-client'

const client = createApiClient({
  goApiUrl: 'http://go.test',
  nodeApiUrl: 'http://node.test',
})

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

describe('api client', () => {
  it('sends the Bearer token and the matrix, and returns the body', async () => {
    const body = { original: [[1]], q: [[1]], r: [[1]], statistics: {} }
    const fetchMock = mockFetch(json(body, 200))

    await expect(client.computeQr('tok', [[1]])).resolves.toEqual(body)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('http://go.test/api/v1/qr')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok',
    )
    expect(init.body).toBe(JSON.stringify({ matrix: [[1]] }))
  })

  it('calls node-api for statistics', async () => {
    const fetchMock = mockFetch(json({ max: 1 }, 200))
    const matrices = { original: [[1]], q: [[1]], r: [[1]] }
    await client.computeStatistics('tok', matrices)
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'http://node.test/api/v1/statistics',
    )
  })

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [422, 'INVALID_MATRIX'],
    [502, 'UPSTREAM_UNAVAILABLE'],
  ])('maps the %i error shape', async (status, code) => {
    mockFetch(json({ error: { code, message: `msg ${code}` } }, status))
    await expect(client.computeQr('t', [[1]])).rejects.toMatchObject({
      status,
      code,
      message: `msg ${code}`,
    })
  })

  it('falls back to a readable message when the body is not the error shape', async () => {
    mockFetch(new Response('<html>', { status: 502 }))
    const error = await client.computeQr('t', [[1]]).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toMatch(/unavailable/)
  })

  it('maps network/CORS failures to a readable error', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    await expect(client.computeQr('t', [[1]])).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: expect.stringContaining('Cannot reach the API'),
    })
  })
})
