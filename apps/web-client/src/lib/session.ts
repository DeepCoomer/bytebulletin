// Server-only: owner password verification + signed session tokens.
// The scrypt hash doubles as the HMAC signing secret, so rotating the password
// invalidates every existing session — exactly the behavior you want.
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'bb_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password.normalize(), Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Token format: `<expiry-epoch-ms>.<hmac>` */
export function createSessionToken(secret: string): string {
  const exp = String(Date.now() + SESSION_TTL_SECONDS * 1000);
  return `${exp}.${sign(exp, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expected = Buffer.from(sign(exp, secret));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  return Number(exp) > Date.now();
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
} as const;
