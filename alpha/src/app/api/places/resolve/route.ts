import { NextRequest, NextResponse } from 'next/server';
import { requireDevice } from '@/lib/session';
import { getStore, isUuid } from '@/lib/store';
import { findGooglePlaces } from '@/lib/googlePlacesServer';
import { hasLinkedPlace, isGeoPoint } from '@/lib/mapLocations';

/** Resolve a legacy address only on the user's explicit request; never invent map positions. */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await requireDevice();
    const { id } = await request.json();
    if (!isUuid(id)) return NextResponse.json({ detail: '로그를 확인해 주세요.' }, { status: 400 });
    const item = await getStore().getOwnedArchive(deviceId, id);
    if (!item) return NextResponse.json({ detail: '로그를 찾을 수 없어요.' }, { status: 404 });
    if (isGeoPoint(item.coordinates)) return NextResponse.json({ coordinates: item.coordinates });
    if (!hasLinkedPlace(item)) return NextResponse.json({ detail: '장소를 먼저 연결해 주세요.' }, { status: 400 });
    const google = await findGooglePlaces(`${item.title} ${item.fullAddress || item.addressShort || item.loc}`);
    if (google.status !== 'ready') return NextResponse.json({ detail: '장소 검색 연결을 확인해 주세요.', code: google.status }, { status: 503 });
    const coordinates = google.places[0]?.coordinates;
    if (!isGeoPoint(coordinates)) return NextResponse.json({ detail: '장소를 다시 선택해 위치를 연결해 주세요.' }, { status: 404 });
    return NextResponse.json({ coordinates });
  } catch { return NextResponse.json({ detail: '위치를 연결하지 못했어요. 다시 시도해 주세요.' }, { status: 500 }); }
}
