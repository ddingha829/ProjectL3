import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { newId } from '@/lib/store';
import { getRuntimeEnvKey } from '@/lib/env';
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE } from '@/lib/sessionToken';

export const DEVICE_COOKIE = 'l2_test_device';
function signingSecret(): string {
  const configured = getRuntimeEnvKey('SESSION_SECRET');
  if (configured && configured.length >= 32) return configured;
  // Derive a purpose-specific secret from an existing server-only credential.
  // Never use the public Supabase anon key to sign authentication cookies.
  const serviceKey = getRuntimeEnvKey('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey) return createHash('sha256').update(`l2-session-v1:${serviceKey}`).digest('hex');
  if (process.env.VERCEL) throw new Error('SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY is required');
  const directory = path.join(process.cwd(), '.test-data');
  const filename = path.join(directory, 'session-secret');
  fs.mkdirSync(directory, { recursive: true });
  try { fs.writeFileSync(filename, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  return fs.readFileSync(filename, 'utf8').trim();
}

export async function readDeviceId(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(DEVICE_COOKIE)?.value;
  return verifySessionToken(v, signingSecret());
}

export async function writeDeviceId(id: string): Promise<void> {
  const store = await cookies();
  store.set(DEVICE_COOKIE, createSessionToken(id, signingSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/** Returns the device id, auto-provisioning a secure UUID cookie if absent. */
export async function requireDevice(): Promise<{
  deviceId: string;
  error?: undefined;
}> {
  const existing = await readDeviceId();
  if (existing) return { deviceId: existing };
  const fresh = newId();
  await writeDeviceId(fresh);
  return { deviceId: fresh };
}
