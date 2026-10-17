/**
 * TMDB (The Movie Database) API Client
 * Fetches movie metadata, official posters, release dates, and overviews.
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
}

export function getTmdbApiKey(): string {
  return (
    process.env.TMDB_API_KEY ||
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    '90bfc0a0cd4fc36c572af68273547f42'
  );
}

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: 'w500' | 'w780' | 'original' = 'w780'
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchTmdbMovies(query: string): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey();
  const trimmed = query.trim();
  if (!apiKey || !trimmed) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
        trimmed
      )}&language=ko-KR&include_adult=false`,
      {
        headers: { accept: 'application/json' },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      // Fallback without language param if ko-KR query fails
      const fallback = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
          trimmed
        )}&include_adult=false`,
        { headers: { accept: 'application/json' } }
      );
      if (fallback.ok) {
        const fbData = await fallback.json();
        return fbData.results || [];
      }
      return [];
    }

    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('[TMDB] Search failed:', error);
    return [];
  }
}
