import { describe, expect, it } from 'vitest'
import { buildLogtoConfig, callbackUri, readConfig } from './config'

const env = {
  VITE_LOGTO_ENDPOINT: 'https://tenant.logto.app/',
  VITE_LOGTO_APP_ID: 'app-id',
}

describe('readConfig', () => {
  it('reads the Logto settings and applies API URL defaults', () => {
    expect(readConfig(env)).toEqual({
      config: {
        logtoEndpoint: 'https://tenant.logto.app',
        logtoAppId: 'app-id',
        goApiUrl: 'http://localhost:8080',
        nodeApiUrl: 'http://localhost:8081',
      },
    })
  })

  it('lists every missing required variable', () => {
    expect(readConfig({ VITE_LOGTO_APP_ID: 'x' })).toEqual({
      missing: ['VITE_LOGTO_ENDPOINT'],
    })
    expect(readConfig({ ...env, VITE_LOGTO_APP_ID: '  ' })).toEqual({
      missing: ['VITE_LOGTO_APP_ID'],
    })
  })
})

describe('buildLogtoConfig', () => {
  it('has no API resource and no custom scopes (the ID token is the Bearer token)', () => {
    const result = readConfig(env)
    if (!('config' in result)) throw new Error('expected a config')
    const logto = buildLogtoConfig(result.config)
    expect(logto.endpoint).toBe('https://tenant.logto.app')
    expect(logto.appId).toBe('app-id')
    expect(logto.resources).toBeUndefined()
    expect(logto.scopes).toEqual(['email'])
  })
})

describe('callbackUri', () => {
  it('points to /callback on the given origin', () => {
    expect(callbackUri('http://localhost:5173')).toBe(
      'http://localhost:5173/callback',
    )
  })
})
