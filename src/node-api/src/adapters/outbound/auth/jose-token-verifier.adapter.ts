import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import {
  InvalidTokenError,
  type InvalidTokenReason,
  type TokenVerifierPort,
  type VerifiedToken,
} from '../../../application/ports/outbound/token-verifier.port.js';

export interface JoseVerifierOptions {
  issuer: string;
  audience: string;
  keySet: JWTVerifyGetKey;
  clockToleranceSeconds?: number;
}

// Remote JWKS is cached by jose; the cooldown stops a flood of bad `kid`s from
// hammering the identity provider, and the timeout keeps requests from hanging.
export function createRemoteKeySet(jwksUri: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(jwksUri), {
    timeoutDuration: 5_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  });
}

const ALLOWED_ALGORITHMS = ['ES384', 'ES256', 'RS256'];

// jose is used behind the port so the core never learns about JWT libraries.
export class JoseTokenVerifier implements TokenVerifierPort {
  constructor(private readonly options: JoseVerifierOptions) {}

  async verify(token: string): Promise<VerifiedToken> {
    try {
      const { payload } = await jwtVerify(token, this.options.keySet, {
        // Asymmetric algorithms only (Logto signs with ES384 by default): blocks "none"
        // and HS256-with-public-key confusion attacks.
        algorithms: ALLOWED_ALGORITHMS,
        issuer: this.options.issuer,
        audience: this.options.audience,
        clockTolerance: this.options.clockToleranceSeconds ?? 5,
        requiredClaims: ['exp', 'sub'],
      });
      return { subject: String(payload.sub) };
    } catch (error) {
      throw new InvalidTokenError(classify(error));
    }
  }
}

function classify(error: unknown): InvalidTokenReason {
  if (error instanceof errors.JWTExpired) return 'expired';
  if (error instanceof errors.JWTClaimValidationFailed) {
    return error.claim === 'nbf' ? 'not_yet_valid' : 'invalid_claims';
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) return 'invalid_signature';
  if (error instanceof errors.JWKSNoMatchingKey) return 'invalid_signature';
  if (error instanceof errors.JWKSTimeout || error instanceof errors.JWKSInvalid) {
    return 'key_unavailable';
  }
  if (error instanceof errors.JOSEAlgNotAllowed) return 'invalid_signature';
  if (error instanceof errors.JOSEError) return 'malformed';
  // Network failures while fetching the JWKS surface as plain errors: fail closed.
  return 'key_unavailable';
}
