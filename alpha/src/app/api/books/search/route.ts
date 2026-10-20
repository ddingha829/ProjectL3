import { NextRequest, NextResponse } from 'next/server';
import { searchKakaoBooks } from '@/lib/kakaoBooks';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (!query || query.length > 120) return NextResponse.json({ results: [] });
  try {
    const results = await searchKakaoBooks(query);
    if (!results) return NextResponse.json({ error: '책 검색 연결을 준비 중이에요. 카카오 REST API 키를 확인해 주세요.' }, { status: 503 });
    return NextResponse.json({ results });
  } catch { return NextResponse.json({ error: '책을 불러오지 못했어요. 잠시 후 다시 검색해 주세요.' }, { status: 502 }); }
}
