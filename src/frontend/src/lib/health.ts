/** Structured so the UI can translate it. */
export type HealthDetail =
  | { kind: 'http'; status: number }
  | { kind: 'timeout'; ms: number }
  | { kind: 'unreachable'; reason?: string }

export type HealthStatus = 'ok' | 'down'

export interface HealthResult {
  status: HealthStatus
  /** Round-trip time in ms; present even for failures that got a response. */
  latencyMs: number
  detail?: HealthDetail
}

export const HEALTH_TIMEOUT_MS = 3000

/**
 * GET {baseUrl}/health (public, no token). Never throws: network errors,
 * CORS blocks and timeouts all come back as `down` with a readable detail.
 */
export async function checkHealth(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<HealthResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = performance.now()
  const elapsed = () => Math.round(performance.now() - started)
  try {
    const response = await fetchImpl(`${baseUrl}/health`, {
      signal: controller.signal,
    })
    if (!response.ok) {
      return {
        status: 'down',
        latencyMs: elapsed(),
        detail: { kind: 'http', status: response.status },
      }
    }
    return { status: 'ok', latencyMs: elapsed() }
  } catch (e) {
    const timedOut = controller.signal.aborted
    return {
      status: 'down',
      latencyMs: elapsed(),
      // A fetch TypeError is how browsers report both "server down" and CORS blocks.
      detail: timedOut
        ? { kind: 'timeout', ms: timeoutMs }
        : {
            kind: 'unreachable',
            reason: e instanceof Error ? e.message : undefined,
          },
    }
  } finally {
    clearTimeout(timer)
  }
}
