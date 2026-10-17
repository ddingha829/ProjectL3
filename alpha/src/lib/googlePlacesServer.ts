import 'server-only';
import type { GeoPoint } from '@/types/l2';
import { getRuntimeEnvKey } from '@/lib/env';
import { isGeoPoint } from '@/lib/mapLocations';

export interface GooglePlace { id: string; name: string; address: string; coordinates: GeoPoint }
export class GooglePlacesError extends Error {
  constructor(public code: 'billing_required' | 'denied' | 'quota' | 'unavailable') { super(code); }
}

function fail(status: string, message = ''): never {
  if (/billing/i.test(message)) throw new GooglePlacesError('billing_required');
  throw new GooglePlacesError(status === 'OVER_QUERY_LIMIT' ? 'quota' : status === 'REQUEST_DENIED' || status === 'PERMISSION_DENIED' ? 'denied' : 'unavailable');
}

/** Match the enabled Places API; only request name, address and location fields. */
export async function queryGooglePlaces(query: string, key: string, mode: 'legacy' | 'new' = 'legacy'): Promise<GooglePlace[]> {
  if (mode === 'new') {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
      body: JSON.stringify({ textQuery: query, languageCode: 'ko', regionCode: 'KR', maxResultCount: 5 }), signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok) fail(data.error?.status || '', data.error?.message);
    return (data.places || []).flatMap((place: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number } }) => {
      const coordinates = { lat: place.location?.latitude, lng: place.location?.longitude };
      return isGeoPoint(coordinates) ? [{ id: place.id, name: place.displayName?.text || query, address: place.formattedAddress || '', coordinates }] : [];
    });
  }
  const params = new URLSearchParams({ input: query, inputtype: 'textquery', fields: 'place_id,name,formatted_address,geometry', language: 'ko', key });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
  const data = await response.json();
  if (data.status === 'ZERO_RESULTS') return [];
  if (!response.ok || data.status !== 'OK') fail(data.status || '', data.error_message);
  return (data.candidates || []).flatMap((place: { place_id: string; name?: string; formatted_address?: string; geometry?: { location: GeoPoint } }) => isGeoPoint(place.geometry?.location) ? [{ id: place.place_id, name: place.name || query, address: place.formatted_address || '', coordinates: place.geometry!.location }] : []);
}

export async function findGooglePlaces(query: string) {
  const key = getRuntimeEnvKey('GOOGLE_MAPS_API_KEY');
  if (!key) return { places: [] as GooglePlace[], status: 'not_configured' as const };
  try {
    const places = await queryGooglePlaces(query, key, getRuntimeEnvKey('GOOGLE_PLACES_API_MODE') === 'new' ? 'new' : 'legacy');
    return { places, status: 'ready' as const };
  } catch (error) { return { places: [] as GooglePlace[], status: error instanceof GooglePlacesError ? error.code : 'unavailable' as const }; }
}
