import { NextRequest, NextResponse } from 'next/server';
import { requireDevice } from '@/lib/session';
import { getStore } from '@/lib/store';
import { PresetSlot, SkinTheme } from '@/types/l2';

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
    };

    const store = getStore();
    const updated = await store.savePrefs(deviceId, {
      presetSlots: body.presetSlots,
      skins: body.skins,
      authorName: body.authorName,
    });

    return NextResponse.json({
      presetSlots: updated.presetSlots,
      skins: updated.skins,
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
