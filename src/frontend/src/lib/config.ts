export interface AppConfig {
  auth0Domain: string
  auth0ClientId: string
  auth0Audience: string
  goApiUrl: string
  nodeApiUrl: string
}

type Env = Record<string, string | undefined>

export const SCOPES = 'openid profile email qr:write statistics:read'

/** Returns the config, or the missing required variables so the UI can show them. */
export function readConfig(
  env: Env,
): { config: AppConfig } | { missing: string[] } {
  const required = [
    'VITE_AUTH0_DOMAIN',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_AUDIENCE',
  ]
  const missing = required.filter((name) => !env[name]?.trim())
  if (missing.length > 0) return { missing }

  const url = (value: string | undefined, fallback: string) =>
    (value?.trim() || fallback).replace(/\/$/, '')

  return {
    config: {
      auth0Domain: env.VITE_AUTH0_DOMAIN!.trim(),
      auth0ClientId: env.VITE_AUTH0_CLIENT_ID!.trim(),
      auth0Audience: env.VITE_AUTH0_AUDIENCE!.trim(),
      goApiUrl: url(env.VITE_GO_API_URL, 'http://localhost:8080'),
      nodeApiUrl: url(env.VITE_NODE_API_URL, 'http://localhost:8081'),
    },
  }
}
