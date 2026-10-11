import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccessToken } from './use-api'

const sdk = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  getAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}))

vi.mock('@logto/react', () => ({ useLogto: () => sdk }))

const b64 = (o: object) =>
  btoa(JSON.stringify(o))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
const idToken = (expSeconds: number) =>
  `${b64({ alg: 'ES384' })}.${b64({ exp: expSeconds })}.sig`
const now = () => Math.floor(Date.now() / 1000)

beforeEach(() => {
  sdk.getIdToken.mockReset()
  sdk.getAccessToken.mockReset()
  sdk.clearAccessToken.mockReset()
})

describe('useAccessToken (the ID token is the Bearer token)', () => {
  it('returns the stored ID token while it is still valid, without refreshing', async () => {
    const token = idToken(now() + 600)
    sdk.getIdToken.mockResolvedValue(token)
    const { result } = renderHook(() => useAccessToken())

    await expect(result.current()).resolves.toBe(token)
    expect(sdk.getAccessToken).not.toHaveBeenCalled()
  })

  it('forces a refresh when the ID token is expired, then returns the renewed one', async () => {
    const renewed = idToken(now() + 3600)
    sdk.getIdToken
      .mockResolvedValueOnce(idToken(now() - 10))
      .mockResolvedValueOnce(renewed)
    const { result } = renderHook(() => useAccessToken())

    await expect(result.current()).resolves.toBe(renewed)
    expect(sdk.clearAccessToken).toHaveBeenCalledTimes(1)
    expect(sdk.getAccessToken).toHaveBeenCalledTimes(1)
  })

  it('throws when Logto has no ID token, so the UI shows the translated error', async () => {
    sdk.getIdToken.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAccessToken())

    await expect(result.current()).rejects.toThrow('No ID token')
  })
})
