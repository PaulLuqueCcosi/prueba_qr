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
export function createRemoteKeySet(domain: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`), {
    timeoutDuration: 5_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  });
}

// jose is used behind the port so the core never learns about JWT libraries.
export class JoseTokenVerifier implements TokenVerifierPort {
  constructor(private readonly options: JoseVerifierOptions) {}

  async verify(token: string): Promise<VerifiedToken> {
    try {
      const { payload } = await jwtVerify(token, this.options.keySet, {
        // RS256 only: blocks "none" and HS256-with-public-key confusion attacks.
        algorithms: ['RS256'],
        issuer: this.options.issuer,
        audience: this.options.audience,
        clockTolerance: this.options.clockToleranceSeconds ?? 5,
        requiredClaims: ['exp', 'sub'],
      });
      const scope = typeof payload['scope'] === 'string' ? payload['scope'] : '';
      return {
        subject: String(payload.sub),
        scopes: scope.split(/\s+/).filter((s) => s.length > 0),
      };
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
