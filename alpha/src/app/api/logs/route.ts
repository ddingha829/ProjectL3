import { NextRequest, NextResponse } from 'next/server';
import { requireDevice } from '@/lib/session';
import { getStore, isUuid } from '@/lib/store';
import { normalizeLogInput } from '@/lib/store/logInput';

export async function GET() {
  try {
    const { deviceId } = await requireDevice();
    const store = getStore();
    const profile = await store.ensureProfile(deviceId);
    return NextResponse.json({
      archives: await store.listArchives(deviceId), presetSlots: profile.presetSlots,
      skins: profile.skins, defaultPresetId: profile.defaultPresetId, authorName: profile.authorName, recoveryCode: profile.recoveryCode, deviceId,
    });
  } catch (error) {
    return NextResponse.json({ error: 'FETCH_FAILED', detail: String(error) }, { status: 500 });
  }
}

async function save(req: NextRequest, editing: boolean) {
  try {
    const { deviceId } = await requireDevice();
    const store = getStore();
    await store.ensureProfile(deviceId);
    const raw = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ error: 'INVALID_INPUT', detail: '올바른 기록을 보내주세요.' }, { status: 400 });
    if (raw.expectedDeviceId && raw.expectedDeviceId !== deviceId) return NextResponse.json({ error: 'DEVICE_CHANGED', detail: '계정이 변경되어 이전 기록을 전송하지 않았어요.' }, { status: 409 });
    if (editing && !isUuid(raw.id)) return NextResponse.json({ error: 'INVALID_ID', detail: '수정할 기록을 확인해주세요.' }, { status: 400 });
    const existing = isUuid(raw.id) ? await store.getOwnedArchive(deviceId, raw.id) : null;
    if (editing && !existing) return NextResponse.json({ error: 'NOT_FOUND', detail: '수정할 기록을 찾을 수 없습니다.' }, { status: 404 });
    const appendOnly = !editing && raw.appendOnly === true;
    if (appendOnly && existing) return NextResponse.json({ item: existing, archives: await store.listArchives(deviceId) });
    let item;
    try {
      // One browser-generated UUID remains the same across network retries.
      item = normalizeLogInput(raw, existing || undefined);
    } catch (error) {
      return NextResponse.json({ error: 'INVALID_INPUT', detail: String(error).replace(/^Error: /, '') }, { status: 400 });
    }
    if (item.memberIds) {
      for (const id of item.memberIds) {
        const member = await store.getOwnedArchive(deviceId, id);
        if ((!member && !existing?.memberIds?.includes(id)) || member?.cat === 'GROUP') return NextResponse.json({ error: 'INVALID_GROUP', detail: '내 로그만 그룹에 담을 수 있어요.' }, { status: 400 });
      }
    }
    if (item.img.startsWith('data:') && item.img !== existing?.img) item.img = await store.uploadPhoto(deviceId, item.img);
    const saved = await store.saveArchive(deviceId, item, appendOnly);
    if (!saved) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    return NextResponse.json({ item: saved, archives: await store.listArchives(deviceId) }, { status: existing || editing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: 'SAVE_FAILED', detail: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return save(req, false); }
export async function PATCH(req: NextRequest) { return save(req, true); }

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!isUuid(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  try {
    const { deviceId } = await requireDevice();
    const expected = req.nextUrl.searchParams.get('expectedDeviceId');
    if (expected && expected !== deviceId) return NextResponse.json({ error: 'DEVICE_CHANGED' }, { status: 409 });
    const store = getStore();
    await store.deleteArchive(deviceId, id);
    return NextResponse.json({ archives: await store.listArchives(deviceId) });
  } catch (error) {
    return NextResponse.json({ error: 'DELETE_FAILED', detail: String(error) }, { status: 500 });
  }
}
