import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isUuid, newId } from '@/lib/store';

export const DEVICE_COOKIE = 'l2_device';
// Chrome caps cookie lifetime at 400 days.
const MAX_AGE = 60 * 60 * 24 * 400;

export async function readDeviceId(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(DEVICE_COOKIE)?.value;
  return isUuid(v) ? v : null;
}

export async function writeDeviceId(id: string): Promise<void> {
  const store = await cookies();
  store.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
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
