import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useState } from 'react'
import { ApiError } from '@/lib/api-client'

interface ApiState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
}

/** Fetches a fresh token for a single use; throws when Auth0 gives none. */
export function useAccessToken() {
  const { getAccessTokenSilently } = useAuth0()
  return useCallback(async () => {
    const token = await getAccessTokenSilently()
    if (!token) throw new Error('No access token')
    return token
  }, [getAccessTokenSilently])
}

/**
 * Runs an authenticated API call. The token is fetched right before each call
 * and never stored in state, so it lives in memory only as long as needed.
 */
export function useApi<I, T>(call: (token: string, input: I) => Promise<T>) {
  const getToken = useAccessToken()
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: false,
  })

  const run = useCallback(
    async (input: I) => {
      setState({ data: null, error: null, loading: true })
      try {
        const token = await getToken()
        const data = await call(token, input)
        setState({ data, error: null, loading: false })
      } catch (e) {
        const error =
          e instanceof ApiError
            ? e
            : new ApiError(
                0,
                'TOKEN_ERROR',
                'Could not get an access token. Try logging out and in again.',
              )
        setState({ data: null, error, loading: false })
      }
    },
    [call, getToken],
  )

  /** Shows a client-side validation problem through the same error channel as API errors. */
  const fail = useCallback((message: string) => {
    setState({
      data: null,
      error: new ApiError(0, 'CLIENT_VALIDATION', message),
      loading: false,
    })
  }, [])

  return { ...state, run, fail }
}
