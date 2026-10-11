export interface AuthConfig {
  // Logto tenant endpoint without trailing slash, e.g. https://<tenant>.logto.app
  endpoint: string;
  // Derived: Logto puts exactly `${endpoint}/oidc` (no trailing slash) in the `iss` claim.
  issuer: string;
  // Derived: where the tenant publishes its signing keys.
  jwksUri: string;
  // The SPA's Logto application id: Logto sets it as the ID token `aud`.
  audience: string;
}

export interface EnvConfig {
  port: number;
  diagonalTolerance: number;
  auth: AuthConfig;
  corsOrigins: string[];
}

const DEFAULT_PORT = 8081;
const DEFAULT_DIAGONAL_TOLERANCE = 1e-9;
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173';

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  return {
    port: parsePort(env['PORT']),
    diagonalTolerance: parseTolerance(env['DIAGONAL_TOLERANCE']),
    auth: parseAuth(env['LOGTO_ENDPOINT'], env['LOGTO_APP_ID']),
    corsOrigins: parseCorsOrigins(env['CORS_ORIGINS']),
  };
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer between 0 and 65535, got "${raw}"`);
  }
  return port;
}

// Fail fast at startup: a bad tolerance would silently skew every diagonal result.
function parseTolerance(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_DIAGONAL_TOLERANCE;
  const tolerance = Number(raw);
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error(`DIAGONAL_TOLERANCE must be a positive finite number, got "${raw}"`);
  }
  return tolerance;
}

// No defaults: running without auth settings must be impossible (fail closed).
function parseAuth(rawEndpoint: string | undefined, rawAudience: string | undefined): AuthConfig {
  const value = rawEndpoint?.trim() ?? '';
  if (value === '') throw new Error('LOGTO_ENDPOINT is required');
  // Origin only: a path or query would silently build a wrong issuer.
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `LOGTO_ENDPOINT must be a URL such as https://<tenant>.logto.app, got "${value}"`,
    );
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value.replace(/\/$/, '')) {
    throw new Error(`LOGTO_ENDPOINT must be a plain origin without path, got "${value}"`);
  }
  const audience = rawAudience?.trim() ?? '';
  if (audience === '') throw new Error('LOGTO_APP_ID is required');
  return {
    endpoint: url.origin,
    issuer: `${url.origin}/oidc`,
    jwksUri: `${url.origin}/oidc/jwks`,
    audience,
  };
}

function parseCorsOrigins(raw: string | undefined): string[] {
  const value = raw === undefined || raw.trim() === '' ? DEFAULT_CORS_ORIGINS : raw;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item) => {
      // Wildcards are refused: the API accepts bearer tokens from browsers.
      let url: URL;
      try {
        url = new URL(item);
      } catch {
        throw new Error(`CORS_ORIGINS has an invalid origin "${item}"`);
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== item.replace(/\/$/, '')) {
        throw new Error(`CORS_ORIGINS entries must be plain origins, got "${item}"`);
      }
      return url.origin;
    });
}
