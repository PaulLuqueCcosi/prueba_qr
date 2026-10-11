import type { Matrices, Matrix, QrResponse, Statistics } from './types'

/** Readable error carrying the HTTP status (0 = no response) and the API error code. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Malformed request (invalid JSON).',
  401: 'Unauthorized: the token is missing, invalid or expired.',
  403: 'Forbidden: access denied.',
  413: 'Payload too large.',
  422: 'The matrix is invalid.',
  502: 'The upstream API (node-api) is unavailable.',
}

async function post<T>(
  baseUrl: string,
  path: string,
  token: string,
  body: unknown,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // fetch only rejects on network/CORS failures, never on HTTP error statuses.
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Cannot reach the API at ${baseUrl}. Is it running, and does CORS allow this origin?`,
    )
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const apiError = payload?.error
    throw new ApiError(
      response.status,
      typeof apiError?.code === 'string' ? apiError.code : 'HTTP_ERROR',
      typeof apiError?.message === 'string'
        ? apiError.message
        : (FALLBACK_MESSAGES[response.status] ??
            `Unexpected response (${response.status}).`),
    )
  }
  return (await response.json()) as T
}

export function createApiClient(urls: {
  goApiUrl: string
  nodeApiUrl: string
}) {
  return {
    computeQr: (token: string, matrix: Matrix) =>
      post<QrResponse>(urls.goApiUrl, '/api/v1/qr', token, { matrix }),
    computeStatistics: (token: string, matrices: Matrices) =>
      post<Statistics>(urls.nodeApiUrl, '/api/v1/statistics', token, {
        matrices,
      }),
  }
}
