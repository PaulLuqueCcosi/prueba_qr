import { describe, expect, it } from 'vitest'
import { decodeJwtClaims, isExpiring } from './token'

const b64 = (o: object) =>
  btoa(JSON.stringify(o))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
const jwt = (claims: object) => `${b64({ alg: 'ES384' })}.${b64(claims)}.sig`

describe('decodeJwtClaims', () => {
  it('reads the payload without verifying it', () => {
    expect(decodeJwtClaims(jwt({ iss: 'x', exp: 5 }))).toEqual({
      iss: 'x',
      exp: 5,
    })
  })

  it('returns null for something that is not a JWT', () => {
    expect(decodeJwtClaims('nope')).toBeNull()
    expect(decodeJwtClaims('a.%%%.c')).toBeNull()
  })
})

describe('isExpiring', () => {
  const now = 1_000_000_000_000 // ms
  const sec = now / 1000

  it('is false while more than the margin remains', () => {
    expect(isExpiring(jwt({ exp: sec + 600 }), now)).toBe(false)
  })

  it('is true when expired or within the margin', () => {
    expect(isExpiring(jwt({ exp: sec - 1 }), now)).toBe(true)
    expect(isExpiring(jwt({ exp: sec + 10 }), now)).toBe(true)
  })

  it('treats an unreadable token or a missing exp as expiring (fail safe)', () => {
    expect(isExpiring('garbage', now)).toBe(true)
    expect(isExpiring(jwt({}), now)).toBe(true)
  })
})
