import { getRuntimeEnvKey } from './env';
import { plainMediaText, type MediaResult } from './media';

export function kakaoBookImage(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    if (!/^search[1-4]\.kakaocdn\.net$/.test(url.hostname) || !['https:','http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    url.protocol = 'https:';
    return url.href;
  } catch { return null; }
}
export async function searchKakaoBooks(query: string): Promise<MediaResult[] | null> {
  const key = getRuntimeEnvKey('KAKAO_REST_API_KEY');
  if (!key) return null;
  const params = new URLSearchParams({ query, size: '18', sort: 'accuracy' });
  const response = await fetch(`https://dapi.kakao.com/v3/search/book?${params}`, { headers: { Authorization: `KakaoAK ${key}` }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('BOOK_SEARCH_UNAVAILABLE');
  const data = await response.json();
  return (Array.isArray(data.documents) ? data.documents : []).flatMap((raw: Record<string, unknown>) => {
    const title = plainMediaText(raw.title), image = kakaoBookImage(raw.thumbnail);
    if (!title) return [];
    return [{ id: plainMediaText(raw.isbn) || plainMediaText(raw.url), type: 'book' as const, title,
      poster: image ? `/api/media/image?url=${encodeURIComponent(image)}` : '', overview: plainMediaText(raw.contents).slice(0,2000),
      rating: 0, year: String(raw.datetime || '').slice(0,4), authors: Array.isArray(raw.authors) ? raw.authors.map(plainMediaText) : [],
      publisher: plainMediaText(raw.publisher), isbn: plainMediaText(raw.isbn), url: plainMediaText(raw.url) }];
  });
}
