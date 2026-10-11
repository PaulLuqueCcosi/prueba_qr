import type { LogtoConfig } from '@logto/react'

export interface AppConfig {
  logtoEndpoint: string
  logtoAppId: string
  goApiUrl: string
  nodeApiUrl: string
}

type Env = Record<string, string | undefined>

/** Path Logto redirects back to after sign-in (must be registered as a redirect URI in the Logto app). */
export const CALLBACK_PATH = '/callback'

/** Returns the config, or the missing required variables so the UI can show them. */
export function readConfig(
  env: Env,
): { config: AppConfig } | { missing: string[] } {
  const required = ['VITE_LOGTO_ENDPOINT', 'VITE_LOGTO_APP_ID']
  const missing = required.filter((name) => !env[name]?.trim())
  if (missing.length > 0) return { missing }

  const url = (value: string | undefined, fallback: string) =>
    (value?.trim() || fallback).replace(/\/$/, '')

  return {
    config: {
      logtoEndpoint: env.VITE_LOGTO_ENDPOINT!.trim().replace(/\/$/, ''),
      logtoAppId: env.VITE_LOGTO_APP_ID!.trim(),
      goApiUrl: url(env.VITE_GO_API_URL, 'http://localhost:8080'),
      nodeApiUrl: url(env.VITE_NODE_API_URL, 'http://localhost:8081'),
    },
  }
}

/**
 * Logto SDK settings. There is no API resource and no custom scopes (Logto's
 * Free plan has neither): the ID token is the Bearer token for the APIs, and its
 * `aud` is this app's id. `openid`, `profile` and `offline_access` are added by
 * the SDK; `email` puts the email in the ID token (the sidebar shows it).
 */
export function buildLogtoConfig(config: AppConfig): LogtoConfig {
  return {
    endpoint: config.logtoEndpoint,
    appId: config.logtoAppId,
    scopes: ['email'],
  }
}

export const callbackUri = (origin: string) => `${origin}${CALLBACK_PATH}`
