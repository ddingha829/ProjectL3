import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { DEVICE_COOKIE, requireDevice } from '@/lib/session';
import { GOOGLE_CALLBACK_PATH, GOOGLE_FLOW_COOKIE, googleAuthAvailable, googleAuthConfig, newPkce } from '@/lib/googleAuth';

export async function GET() {
  return NextResponse.json({ available: await googleAuthAvailable() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: '다시 로그인해 주세요.' }, { status: 403 });
  if (!await googleAuthAvailable()) return NextResponse.json({ error: '구글 로그인 설정을 확인해 주세요.' }, { status: 503 });
  await requireDevice();
  const store = await cookies(), { verifier, challenge } = newPkce();
  store.set(GOOGLE_FLOW_COOKIE, JSON.stringify({ verifier, ownerToken: store.get(DEVICE_COOKIE)?.value, issuedAt: Date.now() }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google', maxAge: 600,
  });
  const url = new URL(`${googleAuthConfig()!.url}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', `${request.nextUrl.origin}${GOOGLE_CALLBACK_PATH}`);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 's256');
  return NextResponse.json({ url: url.toString() }, { headers: { 'Cache-Control': 'no-store' } });
}
