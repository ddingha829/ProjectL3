import { NextRequest, NextResponse } from 'next/server';
import { kakaoBookImage } from '@/lib/kakaoBooks';

/** A fixed CDN allowlist keeps book covers exportable without a CORS-dependent canvas. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url') || '';
  const url = raw.length <= 2000 ? kakaoBookImage(raw) : null;
  if (!url) return new NextResponse(null, { status: 400 });
  try {
    const response = await fetch(url, { redirect: 'error', next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(type) || Number(response.headers.get('content-length')) > 3 * 1024 * 1024) return new NextResponse(null, { status: 502 });
    const reader = response.body?.getReader();
    if (!reader) return new NextResponse(null, { status: 502 });
    let size = 0; const chunks: Uint8Array<ArrayBuffer>[] = [];
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 3 * 1024 * 1024) { await reader.cancel(); return new NextResponse(null, { status: 413 }); } chunks.push(new Uint8Array(value)); }
    if (!size) return new NextResponse(null, { status: 502 });
    return new NextResponse(new Blob(chunks, { type }), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new NextResponse(null, { status: 502 }); }
}
