import { useLogto } from '@logto/react'
import { useEffect, useState } from 'react'

export interface UserProfile {
  name?: string
  email?: string
  picture?: string
}

/** Name, email and picture from the ID token claims, loaded once the user is signed in. */
export function useUserProfile(): UserProfile | null {
  const { isAuthenticated, getIdTokenClaims } = useLogto()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    void getIdTokenClaims().then((claims) => {
      if (cancelled || !claims) return
      setProfile({
        name: claims.name ?? claims.username ?? undefined,
        email: claims.email ?? undefined,
        picture: claims.picture ?? undefined,
      })
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, getIdTokenClaims])

  // Derived, so signing out hides the profile without a state update in the effect.
  return isAuthenticated ? profile : null
}
