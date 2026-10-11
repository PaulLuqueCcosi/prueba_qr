import { useLogto } from '@logto/react'
import { useCallback, useState } from 'react'
import { ApiError } from '@/lib/api-client'
import { isExpiring } from '@/lib/token'

interface ApiState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
}

/**
 * Gets the user's ID token, which is the Bearer token for both APIs (Logto's
 * Free plan has no API resources). The SDK only refreshes tokens when asked for
 * an access token, so an expired or expiring ID token is renewed through the
 * refresh token first. Throws when Logto gives none, e.g. the session ended.
 */
export function useAccessToken() {
  const { getIdToken, getAccessToken, clearAccessToken } = useLogto()
  return useCallback(async () => {
    let token = await getIdToken()
    if (!token || isExpiring(token)) {
      // Dropping the cached access token forces a refresh-token grant, which also renews the ID token.
      await clearAccessToken()
      await getAccessToken()
      token = await getIdToken()
    }
    if (!token) throw new Error('No ID token')
    return token
  }, [getIdToken, getAccessToken, clearAccessToken])
}

/**
 * Runs an authenticated API call. The token is requested right before each call
 * and never stored in state.
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
                'Could not get the ID token. Try logging out and in again.',
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
