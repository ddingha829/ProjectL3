import { NextRequest, NextResponse } from 'next/server';
import { requireDevice } from '@/lib/session';
import { getStore } from '@/lib/store';
import { PresetSlot, SkinTheme } from '@/types/l2';
import { normalizePresetSlot } from '@/lib/cardAppearance';

export async function GET() {
  const session = await requireDevice();
  if (session.error) return session.error;
  const { deviceId } = session;

  try {
    const store = getStore();
    const profile = await store.ensureProfile(deviceId);
    return NextResponse.json({
      presetSlots: profile.presetSlots,
      skins: profile.skins,
      defaultPresetId: profile.defaultPresetId,
      authorName: profile.authorName,
      recoveryCode: profile.recoveryCode,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'FAILED_TO_GET_PRESETS', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireDevice();
  if (session.error) return session.error;
  const { deviceId } = session;

  try {
    const body = (await req.json()) as {
      presetSlots?: PresetSlot[];
      skins?: Record<string, SkinTheme>;
      authorName?: string;
      replaceSkins?: boolean;
      defaultPresetId?: string;
      expectedDeviceId?: string;
    };

    if (body.expectedDeviceId && body.expectedDeviceId !== deviceId) {
      return NextResponse.json({ error: 'DEVICE_CHANGED', detail: '기기가 변경되어 이전 스타일을 전송하지 않았어요.' }, { status: 409 });
    }
    if (body.presetSlots && (!Array.isArray(body.presetSlots) || body.presetSlots.length < 1 || body.presetSlots.length > 20 || body.presetSlots.some(slot => !normalizePresetSlot(slot)) || new Set(body.presetSlots.map(slot => slot.id)).size !== body.presetSlots.length)) return NextResponse.json({ error: 'INVALID_PRESETS', detail: '프리셋은 1~20개까지 저장할 수 있어요.' }, { status: 400 });

    const store = getStore();
    const updated = await store.savePrefs(deviceId, {
      presetSlots: body.presetSlots,
      skins: body.skins,
      authorName: body.authorName,
      replaceSkins: body.replaceSkins === true,
      defaultPresetId: body.defaultPresetId,
    });

    return NextResponse.json({
      presetSlots: updated.presetSlots,
      skins: updated.skins,
      defaultPresetId: updated.defaultPresetId,
      authorName: updated.authorName,
      recoveryCode: updated.recoveryCode,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update presets', detail: String(err) },
      { status: 400 }
    );
  }
}
