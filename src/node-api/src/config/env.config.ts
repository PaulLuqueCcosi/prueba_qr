export interface EnvConfig {
  port: number;
  diagonalTolerance: number;
}

const DEFAULT_PORT = 8081;
const DEFAULT_DIAGONAL_TOLERANCE = 1e-9;

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  return {
    port: parsePort(env['PORT']),
    diagonalTolerance: parseTolerance(env['DIAGONAL_TOLERANCE']),
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
