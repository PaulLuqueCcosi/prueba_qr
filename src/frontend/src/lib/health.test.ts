import { describe, expect, it, vi } from 'vitest'
import { checkHealth } from './health'

describe('checkHealth', () => {
  it('reports ok with latency for a 200', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    const result = await checkHealth('http://x.test', fetchMock as never)
    expect(result.status).toBe('ok')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://x.test/health',
      expect.anything(),
    )
  })

  it('reports down for a non-2xx response', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('', { status: 503 })),
    )
    const result = await checkHealth('http://x.test', fetchMock as never)
    expect(result).toMatchObject({
      status: 'down',
      detail: { kind: 'http', status: 503 },
    })
  })

  it('reports down on network errors without throwing', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('Failed')))
    const result = await checkHealth('http://x.test', fetchMock as never)
    expect(result.status).toBe('down')
    expect(result.detail).toEqual({ kind: 'unreachable', reason: 'Failed' })
  })

  it('aborts and reports a timeout', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const result = await checkHealth('http://x.test', fetchMock as never, 20)
    expect(result).toMatchObject({
      status: 'down',
      detail: { kind: 'timeout', ms: 20 },
    })
  })
})
