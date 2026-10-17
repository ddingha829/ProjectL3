import { NextRequest, NextResponse } from 'next/server';
import { requireDevice } from '@/lib/session';
import { getStore, isUuid, newId } from '@/lib/store';
import {
  extractBadFromText,
  extractGoodFromText,
  extractNoteFromText,
} from '@/data/initialData';
import { ArchiveItem } from '@/types/l2';

export async function GET() {
  const session = await requireDevice();
  if (session.error) return session.error;
  const { deviceId } = session;

  try {
    const store = getStore();
    const profile = await store.ensureProfile(deviceId);
    const archives = await store.listArchives(deviceId);

    return NextResponse.json({
      archives,
      presetSlots: profile.presetSlots,
      skins: profile.skins,
      authorName: profile.authorName,
      recoveryCode: profile.recoveryCode,
      deviceId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'FAILED_TO_FETCH_LOGS', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireDevice();
  if (session.error) return session.error;
  const { deviceId } = session;

  try {
    const body = (await req.json()) as Partial<ArchiveItem>;
    const store = getStore();
    const profile = await store.ensureProfile(deviceId);

    const title = (body.title || '무제 로그').trim();
    const quote = (
      body.quote ||
      `${title}에서의 인상적인 순간을 기록한 아카이브 로그입니다.`
    ).trim();
    const loc = (body.loc || 'SEONGSU').trim();
    const cat = body.cat || 'DINING';

    const good = (body.good || '').trim() || extractGoodFromText(quote, title);
    const bad = (body.bad || '').trim() || extractBadFromText(quote);
    const note = (body.note || '').trim() || extractNoteFromText(quote, loc);

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    // Secure, unguessable UUID for public sharing
    const itemId = body.id && isUuid(body.id) ? body.id : newId();

    // Upload image to storage if base64 data-URL
    let imageUrl = body.img || '/images/korean.jpg';
    if (imageUrl.startsWith('data:')) {
      try {
        imageUrl = await store.uploadPhoto(deviceId, imageUrl);
      } catch (uploadErr) {
        console.warn('Photo upload failed, using fallback:', uploadErr);
        // If upload fails in local dev, keep dataUrl or fallback
      }
    }

    const newItem: ArchiveItem = {
      id: itemId,
      num: '01', // Dynamically numbered by store.listArchives
      cat,
      sub: body.sub || `${cat} · ${loc}`,
      title,
      loc,
      addressShort: body.addressShort || '서울 성동구 성수동',
      fullAddress: body.fullAddress || body.addressShort || '서울 성동구 성수동',
      date: body.date || `${yy}.${mm}.${dd}`,
      timestamp: body.timestamp || Date.now(),
      score: body.score || '4.5',
      quote,
      good,
      bad,
      note,
      link:
        body.link ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          title
        )}`,
      img: imageUrl,
      hasPhoto: typeof body.hasPhoto === 'boolean' ? body.hasPhoto : Boolean(imageUrl),
      cropX: typeof body.cropX === 'number' ? body.cropX : 50,
      cropY: typeof body.cropY === 'number' ? body.cropY : 50,
      mapX:
        typeof body.mapX === 'number'
          ? body.mapX
          : Math.floor(25 + Math.random() * 50),
      mapY:
        typeof body.mapY === 'number'
          ? body.mapY
          : Math.floor(25 + Math.random() * 50),
      author: body.author || profile.authorName || 'L2. ARCHIVE',
    };

    const saved = await store.saveArchive(deviceId, newItem);
    if (!saved) {
      return NextResponse.json(
        { error: 'PERMISSION_DENIED', detail: '해당 로그를 생성할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const nextArchives = await store.listArchives(deviceId);
    return NextResponse.json(
      { item: newItem, archives: nextArchives },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create archive log', detail: String(err) },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireDevice();
  if (session.error) return session.error;
  const { deviceId } = session;

  try {
    const body = (await req.json()) as Partial<ArchiveItem> & { id: string };
    if (!body.id) {
      return NextResponse.json({ error: 'Missing item id' }, { status: 400 });
    }

    const store = getStore();
    const existing = await store.getOwnedArchive(deviceId, body.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND_OR_FORBIDDEN', detail: '수정할 로그를 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    let imageUrl = body.img ?? existing.img;
    if (body.img && body.img.startsWith('data:') && body.img !== existing.img) {
      try {
        imageUrl = await store.uploadPhoto(deviceId, body.img);
      } catch (uploadErr) {
        console.warn('Photo update upload failed:', uploadErr);
      }
    }

    const updatedItem: ArchiveItem = {
      ...existing,
      ...body,
      img: imageUrl,
    };

    await store.saveArchive(deviceId, updatedItem);
    const nextArchives = await store.listArchives(deviceId);
    return NextResponse.json({ item: updatedItem, archives: nextArchives });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update archive log', detail: String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireDevice();
  if (session.error) return session.error;
  const { deviceId } = session;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id query param' }, { status: 400 });
  }

  try {
    const store = getStore();
    await store.deleteArchive(deviceId, id);
    const nextArchives = await store.listArchives(deviceId);
    return NextResponse.json({ archives: nextArchives });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to delete archive log', detail: String(err) },
      { status: 400 }
    );
  }
}
