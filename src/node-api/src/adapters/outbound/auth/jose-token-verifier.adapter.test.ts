import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWK,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { InvalidTokenError } from '../../../application/ports/outbound/token-verifier.port.js';
import { JoseTokenVerifier } from './jose-token-verifier.adapter.js';

const ISSUER = 'https://tenant.example.auth0.com/';
const AUDIENCE = 'https://api.example.dev';

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let publicJwk: JWK;
let verifier: JoseTokenVerifier;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  const other = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherPrivateKey = other.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  verifier = new JoseTokenVerifier({
    issuer: ISSUER,
    audience: AUDIENCE,
    keySet: createLocalJWKSet({ keys: [publicJwk] }),
  });
});

interface Overrides {
  key?: CryptoKey;
  issuer?: string;
  audience?: string;
  expiresAt?: number | string;
  notBefore?: number | string;
  scope?: string | null;
}

async function sign(o: Overrides = {}): Promise<string> {
  const claims = o.scope === null ? {} : { scope: o.scope ?? 'statistics:read' };
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setSubject('auth0|user1')
    .setIssuer(o.issuer ?? ISSUER)
    .setAudience(o.audience ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(o.expiresAt ?? '5m');
  if (o.notBefore !== undefined) jwt.setNotBefore(o.notBefore);
  return jwt.sign(o.key ?? privateKey);
}

async function reasonOf(token: string): Promise<string | undefined> {
  try {
    await verifier.verify(token);
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidTokenError);
    return (error as InvalidTokenError).reason;
  }
  return undefined;
}

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JoseTokenVerifier', () => {
  it('accepts a valid token and returns subject and scopes', async () => {
    const result = await verifier.verify(await sign());
    expect(result).toEqual({ subject: 'auth0|user1', scopes: ['statistics:read'] });
  });

  it('parses a space-separated scope claim into several scopes', async () => {
    const result = await verifier.verify(await sign({ scope: 'openid  qr:write statistics:read' }));
    expect(result.scopes).toEqual(['openid', 'qr:write', 'statistics:read']);
  });

  it('returns no scopes when the claim is absent', async () => {
    expect((await verifier.verify(await sign({ scope: null }))).scopes).toEqual([]);
  });

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(await reasonOf(await sign({ expiresAt: past }))).toBe('expired');
  });

  it('tolerates a few seconds of clock skew', async () => {
    const justExpired = Math.floor(Date.now() / 1000) - 2;
    await expect(verifier.verify(await sign({ expiresAt: justExpired }))).resolves.toBeDefined();
  });

  it('rejects a token that is not valid yet', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(await reasonOf(await sign({ notBefore: future }))).toBe('not_yet_valid');
  });

  it('rejects the wrong audience', async () => {
    expect(await reasonOf(await sign({ audience: 'https://other.example' }))).toBe(
      'invalid_claims',
    );
  });

  it('rejects the wrong issuer (including a missing trailing slash)', async () => {
    expect(await reasonOf(await sign({ issuer: 'https://evil.example/' }))).toBe('invalid_claims');
    expect(await reasonOf(await sign({ issuer: ISSUER.slice(0, -1) }))).toBe('invalid_claims');
  });

  it('rejects a token signed by another key', async () => {
    expect(await reasonOf(await sign({ key: otherPrivateKey }))).toBe('invalid_signature');
  });

  it('rejects a token without exp', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setSubject('u')
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .sign(privateKey);
    expect(await reasonOf(token)).toBe('invalid_claims');
  });

  it('rejects an unsecured token (alg: none)', async () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const token = `${b64({ alg: 'none' })}.${b64({ sub: 'u', iss: ISSUER, aud: AUDIENCE, exp })}.`;
    expect(await reasonOf(token)).toBeDefined();
  });

  it('rejects algorithm confusion: HS256 signed with the public key as secret', async () => {
    const secret = new TextEncoder().encode(JSON.stringify(publicJwk));
    const token = await new SignJWT({ scope: 'statistics:read' })
      .setProtectedHeader({ alg: 'HS256', kid: 'k1' })
      .setSubject('attacker')
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(secret);
    expect(await reasonOf(token)).toBeDefined();
  });

  it('rejects garbage that is not a JWT', async () => {
    expect(await reasonOf('not-a-jwt')).toBe('malformed');
  });

  it('rejects a token whose kid is not in the key set', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'unknown' })
      .setSubject('u')
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(privateKey);
    expect(await reasonOf(token)).toBe('invalid_signature');
  });
});
