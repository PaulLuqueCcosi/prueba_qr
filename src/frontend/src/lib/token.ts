export interface TokenClaims {
  aud?: string | string[]
  scope?: string
  exp?: number
  [claim: string]: unknown
}

/** Decodes the payload only (no signature check): it is just for display in the Developer panel. */
export function decodeJwtClaims(token: string): TokenClaims | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as TokenClaims
  } catch {
    return null
  }
}
