import { createHmac, timingSafeEqual } from 'crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

export function createSessionToken(id: string, secret: string, now = Date.now()): string {
  if (!UUID.test(id) || secret.length < 32) throw new Error('Invalid session configuration');
  const payload = `v1.${id}.${Math.floor(now / 1000) + SESSION_MAX_AGE}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): string | null {
  if (!token || token.length > 180 || secret.length < 32) return null;
  const [version, id, expiry, signature, extra] = token.split('.');
  if (version !== 'v1' || !UUID.test(id || '') || !/^\d{10,12}$/.test(expiry || '') || !/^[\w-]{43}$/.test(signature || '') || extra !== undefined) return null;
  const seconds = Math.floor(now / 1000);
  if (Number(expiry) <= seconds || Number(expiry) > seconds + SESSION_MAX_AGE + 60) return null;
  const expected = createHmac('sha256', secret).update(`${version}.${id}.${expiry}`).digest();
  const supplied = Buffer.from(signature, 'base64url');
  return supplied.length === expected.length && timingSafeEqual(expected, supplied) ? id : null;
}
