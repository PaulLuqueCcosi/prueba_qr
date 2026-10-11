export interface AuthConfig {
  domain: string;
  // Derived, with trailing slash: Auth0 puts exactly this string in the `iss` claim.
  issuer: string;
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
    auth: parseAuth(env['AUTH0_DOMAIN'], env['AUTH0_AUDIENCE']),
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
function parseAuth(rawDomain: string | undefined, rawAudience: string | undefined): AuthConfig {
  const domain = rawDomain?.trim() ?? '';
  if (domain === '') throw new Error('AUTH0_DOMAIN is required');
  // Hostname only: a scheme or path would silently build a wrong issuer.
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) {
    throw new Error(`AUTH0_DOMAIN must be a hostname without scheme or path, got "${domain}"`);
  }
  const audience = rawAudience?.trim() ?? '';
  if (audience === '') throw new Error('AUTH0_AUDIENCE is required');
  return { domain, issuer: `https://${domain}/`, audience };
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
