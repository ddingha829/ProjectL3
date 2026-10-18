import { NextRequest, NextResponse } from 'next/server';
import { getTmdbApiKey, getTmdbImageUrl } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (query.length < 2 || query.length > 120) return NextResponse.json({ results: [] });
  const key = getTmdbApiKey();
  if (!key) return NextResponse.json({ error: 'TMDB 검색이 아직 연결되지 않았어요.' }, { status: 503 });
  try {
    const params = new URLSearchParams({ api_key: key, query, language: 'ko-KR', include_adult: 'false' });
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?${params}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('TMDB unavailable');
    const data = await response.json();
    const results = (Array.isArray(data.results) ? data.results : []).filter((item: { media_type?: string; poster_path?: string }) => ['movie', 'tv'].includes(item.media_type || '') && item.poster_path).slice(0, 16).map((item: { id: number; media_type: string; title?: string; name?: string; poster_path: string; overview?: string; vote_average?: number; release_date?: string; first_air_date?: string }) => ({ id: item.id, type: item.media_type, title: item.title || item.name || '', poster: getTmdbImageUrl(item.poster_path, 'w500'), overview: (item.overview || '').slice(0, 600), rating: Number(item.vote_average) || 0, year: (item.release_date || item.first_air_date || '').slice(0, 4) }));
    return NextResponse.json({ results });
  } catch { return NextResponse.json({ error: '작품을 불러오지 못했어요. 잠시 후 다시 검색해 주세요.' }, { status: 502 }); }
}
