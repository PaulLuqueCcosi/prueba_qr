export interface VerifiedToken {
  subject: string;
  scopes: string[];
}

// Short, stable codes: safe to log and never include token content.
export type InvalidTokenReason =
  | 'malformed'
  | 'invalid_signature'
  | 'invalid_claims'
  | 'expired'
  | 'not_yet_valid'
  | 'key_unavailable';

export class InvalidTokenError extends Error {
  constructor(readonly reason: InvalidTokenReason) {
    super(`invalid token: ${reason}`);
    this.name = 'InvalidTokenError';
  }
}

export interface TokenVerifierPort {
  /** Resolves with the verified identity or rejects with InvalidTokenError. */
  verify(token: string): Promise<VerifiedToken>;
}
