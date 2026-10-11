export interface TokenClaims {
  aud?: string | string[]
  iss?: string
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

/** True when the JWT is expired or about to be (default margin: 30 s), or cannot be read. */
export function isExpiring(
  token: string,
  nowMs = Date.now(),
  marginSeconds = 30,
): boolean {
  const exp = decodeJwtClaims(token)?.exp
  if (typeof exp !== 'number') return true
  return exp * 1000 - nowMs <= marginSeconds * 1000
}
