import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvKey } from '@/lib/env';
import { callGemini } from '@/lib/gemini';
import { MAP_API_PLACES } from '@/data/initialData';
import { MapApiPlace } from '@/types/l2';
import { searchTmdbMovies, getTmdbImageUrl } from '@/lib/tmdb';

function toShortDistrictAddress(fullAddr: string): string {
  const cleaned = fullAddr
    .replace(/^대한민국\s*/, '')
    .replace(/특별자치시|특별자치도|특별시|광역시/g, '')
    .trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  }
  return cleaned || fullAddr;
}

function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const cat = (
    searchParams.get('category') ||
    searchParams.get('cat') ||
    ''
  ).toUpperCase();
  const results: MapApiPlace[] = [];

  // 0. TMDB Movie Search (High priority if category is CINEMA, or when query matches movies)
  const tmdbResults: MapApiPlace[] = [];
  if (q) {
    try {
      const tmdbMovies = await searchTmdbMovies(q);
      for (const m of tmdbMovies.slice(0, 4)) {
        const year = m.release_date ? m.release_date.slice(0, 4) : '';
        const titleWithYear = year ? `${m.title} (${year})` : m.title;
        const short = `개봉 ${m.release_date || '미정'} · 평점 ★${(m.vote_average || 0).toFixed(1)}`;
        const fullAddress = m.overview
          ? `평점 ★${(m.vote_average || 0).toFixed(1)}/10 — ${m.overview}`
          : short;
        const posterUrl = getTmdbImageUrl(m.poster_path, 'w780');

        tmdbResults.push({
          id: `tmdb_${m.id}`,
          name: titleWithYear,
          short,
          fullAddress,
          loc: 'CINEMA · FILM',
          category: 'CINEMA',
          link: `https://www.themoviedb.org/movie/${m.id}`,
          posterImg: posterUrl || undefined,
          source: 'TMDB',
          x: Math.floor(30 + Math.random() * 45),
          y: Math.floor(30 + Math.random() * 45),
        });
      }
    } catch {
      // Fall through to places API
    }
  }

  if (cat === 'CINEMA' && tmdbResults.length > 0) {
    return NextResponse.json({
      results: tmdbResults,
      mapEngine: 'TMDB',
    });
  }

  // Prepend TMDB movie results if query matches a real movie title
  if (tmdbResults.length > 0) {
    results.push(...tmdbResults);
  }

  // 1. Google Places API (New v1) if GOOGLE_MAPS_API_KEY is configured
  const googleKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (q && googleKey) {
    try {
      const gRes = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.googleMapsUri',
          },
          body: JSON.stringify({
            textQuery: q,
            languageCode: 'ko',
            regionCode: 'KR',
          }),
          next: { revalidate: 300 },
        }
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        for (const p of (gData.places || []).slice(0, 5)) {
          const name = p.displayName?.text || q;
          const fullAddr = p.formattedAddress || '';
          const shortAddr = toShortDistrictAddress(fullAddr);
          results.push({
            id: `gmap_${p.id}`,
            name,
            short: shortAddr || '서울 성동구 성수동',
            fullAddress: fullAddr || shortAddr,
            loc: (shortAddr.split(' ')[1] || 'SEOUL').toUpperCase(),
            category: 'DINING',
            link: p.googleMapsUri || buildGoogleMapsUrl(`${name} ${shortAddr}`),
            x: Math.floor(25 + Math.random() * 55),
            y: Math.floor(25 + Math.random() * 55),
          });
        }
      }
    } catch {
      // Fall through to free geocoder / Gemini / local catalog
    }
  }

  // 2. Free OpenStreetMap Nominatim Korean Place Search (Zero API Key required -> Generates Google Maps links!)
  if (q && results.length < 3) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=4&accept-language=ko&q=${encodeURIComponent(
          q
        )}`,
        {
          headers: { 'User-Agent': 'L2-Archive-Card-Engine/1.0' },
          next: { revalidate: 300 },
        }
      );
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        for (const item of nomData || []) {
          const addr = item.address || {};
          const city =
            addr.city || addr.province || addr.state || '서울';
          const borough =
            addr.borough || addr.county || addr.city_district || '';
          const suburb =
            addr.suburb ||
            addr.quarter ||
            addr.neighbourhood ||
            addr.village ||
            addr.town ||
            '';
          const shortAddr = [city, borough, suburb]
            .filter(Boolean)
            .join(' ')
            .replace(/특별시|광역시/g, '');
          const name = (item.name || item.display_name?.split(',')[0] || q).trim();

          if (shortAddr && !results.some((r) => r.name === name && r.short === shortAddr)) {
            results.push({
              id: `nom_${item.place_id}`,
              name,
              short: shortAddr,
              fullAddress: item.display_name || shortAddr,
              loc: (borough || city || 'SEOUL').toUpperCase(),
              category: 'DINING',
              link: buildGoogleMapsUrl(`${name} ${shortAddr}`),
              x: Math.floor(25 + Math.random() * 55),
              y: Math.floor(25 + Math.random() * 55),
            });
          }
        }
      }
    } catch {
      // Fall through to Gemini / local catalog
    }
  }

  // 3. Gemini AI Place Resolver (Uses multi-model fallback to resolve Korean restaurant/place names into exact 시/구/동 + Google Maps URL)
  if (q && results.length === 0) {
    try {
      const gemRes = await callGemini({
        contents: [
          {
            parts: [
              {
                text: `사용자가 한국 장소/맛집/전시/영화를 검색했습니다: "${q}".
가장 관련성 높은 실제 장소 3곳을 JSON 배열로 반환해줘.
각 항목의 키:
- "name": 상호명/장소명
- "short": 시/구/동 단위 짧은 주소 (예: "서울 성동구 성수동", "전남 순천시 향교동", "서울 강남구 서초동")
- "fullAddress": 상세 도로명 주소
- "loc": 영문 대문자 지역명 (예: "SEONGSU", "SUNCHEON", "HANNAM")`,
              },
            ],
          },
        ],
        responseMimeType: 'application/json',
      });

      if (gemRes) {
        const parsed = JSON.parse(gemRes.text);
        if (Array.isArray(parsed)) {
          for (const p of parsed.slice(0, 3)) {
            if (p.name && p.short) {
              results.push({
                id: `gem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: p.name,
                short: p.short,
                fullAddress: p.fullAddress || p.short,
                loc: (p.loc || 'SEOUL').toUpperCase(),
                category: 'DINING',
                link: buildGoogleMapsUrl(`${p.name} ${p.short}`),
                x: Math.floor(25 + Math.random() * 55),
                y: Math.floor(25 + Math.random() * 55),
              });
            }
          }
        }
      }
    } catch {
      // Fall through to local catalog
    }
  }

  // 4. Built-in Curated Korean Catalog (with Google Maps links)
  const lowerQ = q.toLowerCase();
  const localMatches = q
    ? MAP_API_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQ) ||
          p.short.toLowerCase().includes(lowerQ) ||
          (p.fullAddress || '').toLowerCase().includes(lowerQ) ||
          p.loc.toLowerCase().includes(lowerQ)
      )
    : MAP_API_PLACES;

  for (const item of localMatches) {
    if (!results.some((r) => r.name === item.name)) {
      results.push({
        ...item,
        link:
          item.category === 'CINEMA' && item.link.includes('themoviedb')
            ? item.link
            : buildGoogleMapsUrl(`${item.name} ${item.short}`),
      });
    }
  }

  // 5. Instant Google Maps Fallback for any custom query
  if (q && results.length === 0) {
    const inferredDistrict =
      q.includes('서초') || q.includes('강남')
        ? '서울 서초구 서초동'
        : q.includes('한남') || q.includes('용산') || q.includes('이태원')
        ? '서울 용산구 한남동'
        : q.includes('순천')
        ? '전남 순천시 향교동'
        : q.includes('여수')
        ? '전남 여수시 중앙동'
        : q.includes('홍대') || q.includes('연남') || q.includes('마포')
        ? '서울 마포구 연남동'
        : '서울 성동구 성수동';

    results.push({
      id: `custom_${Date.now()}`,
      name: q,
      short: inferredDistrict,
      fullAddress: `${inferredDistrict} (${q})`,
      loc: inferredDistrict.split(' ').slice(-1)[0].toUpperCase(),
      category: 'DINING',
      link: buildGoogleMapsUrl(`${q} ${inferredDistrict}`),
      x: 50,
      y: 48,
    });
  }

  return NextResponse.json({
    results,
    mapEngine: 'GOOGLE_MAPS',
  });
}
