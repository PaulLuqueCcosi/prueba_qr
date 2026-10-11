import { useLogto } from '@logto/react'
import { useCallback, useState } from 'react'
import { callbackUri } from '@/lib/config'

/**
 * Starts the Logto sign-in (full-page redirect with PKCE; the SDK has no popup
 * flow). `pending` covers the moment before the browser leaves the page; if
 * starting fails, `failed` lets the UI offer a retry instead of staying stuck.
 */
export function useSignIn() {
  const { signIn } = useLogto()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const start = useCallback(() => {
    setFailed(false)
    setPending(true)
    signIn(callbackUri(window.location.origin)).catch(() => {
      setPending(false)
      setFailed(true)
    })
  }, [signIn])

  return { pending, failed, start }
}
