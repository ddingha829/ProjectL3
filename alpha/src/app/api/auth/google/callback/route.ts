import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { DEVICE_COOKIE, readDeviceId, writeDeviceId } from '@/lib/session';
import { GOOGLE_FLOW_COOKIE, verifiedGoogleIdentity } from '@/lib/googleAuth';
import { getStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  const jar = await cookies();
  let success = false;
  try {
    const code = request.nextUrl.searchParams.get('code');
    const raw = jar.get(GOOGLE_FLOW_COOKIE)?.value;
    if (!code || !raw || request.nextUrl.searchParams.has('error')) throw new Error('OAUTH_CANCELLED');
    const flow = JSON.parse(raw);
    if (typeof flow.verifier !== 'string' || flow.verifier.length < 43 ||
        typeof flow.issuedAt !== 'number' || flow.issuedAt > Date.now() || Date.now() - flow.issuedAt > 600000 ||
        !flow.ownerToken || flow.ownerToken !== jar.get(DEVICE_COOKIE)?.value) throw new Error('OAUTH_EXPIRED');
    const previousId = await readDeviceId();
    if (!previousId) throw new Error('OAUTH_SESSION_CHANGED');
    const identity = await verifiedGoogleIdentity(code, flow.verifier);
    const store = getStore();
    if (!store.loginWithGoogle) throw new Error('OAUTH_UNSUPPORTED');
    const result = await store.loginWithGoogle(identity, previousId);
    await writeDeviceId(result.accountId);
    success = true;
  } catch {
    // Do not leak provider tokens, codes or database diagnostics into URLs.
  } finally {
    jar.set(GOOGLE_FLOW_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google', maxAge: 0 });
  }
  return NextResponse.redirect(new URL(`/?auth=${success ? 'connected' : 'retry'}`, request.nextUrl.origin));
}
