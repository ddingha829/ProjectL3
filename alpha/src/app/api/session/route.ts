import { NextRequest, NextResponse } from 'next/server';
import { readDeviceId, writeDeviceId } from '@/lib/session';
import {
  AI_DAILY_LIMIT,
  getStore,
  newId,
  normalizeRecoveryCode,
} from '@/lib/store';

export async function GET() {
  try {
    let deviceId = await readDeviceId();
    let isNewDevice = false;

    if (!deviceId) {
      deviceId = newId();
      await writeDeviceId(deviceId);
      isNewDevice = true;
    }

    const store = getStore();
    const profile = await store.ensureProfile(deviceId);
    const aiUsage = await store.getUsage(deviceId, 'ai');

    return NextResponse.json({
      deviceId,
      recoveryCode: profile.recoveryCode,
      authorName: profile.authorName,
      presetSlots: profile.presetSlots,
      skins: profile.skins,
      defaultPresetId: profile.defaultPresetId,
      isNewDevice,
      storeKind: store.kind,
      aiUsage: {
        used: aiUsage,
        limit: AI_DAILY_LIMIT,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'FAILED_TO_INIT_SESSION', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { recoveryCode } = (await req.json()) as { recoveryCode?: string };
    if (!recoveryCode) {
      return NextResponse.json(
        { error: 'MISSING_RECOVERY_CODE', detail: '복구 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    const normalized = normalizeRecoveryCode(recoveryCode);
    if (!normalized) {
      return NextResponse.json(
        {
          error: 'INVALID_RECOVERY_CODE_FORMAT',
          detail: '올바른 L2 복구 코드 형식(L2-XXXX-XXXX)이 아닙니다.',
        },
        { status: 400 }
      );
    }

    const store = getStore();
    const foundDeviceId = await store.findDeviceByRecoveryCode(normalized);
    if (!foundDeviceId) {
      return NextResponse.json(
        {
          error: 'DEVICE_NOT_FOUND',
          detail: '일치하는 복구 코드를 찾을 수 없습니다.',
        },
        { status: 404 }
      );
    }

    // Switch device session cookie to the recovered device
    await writeDeviceId(foundDeviceId);
    const profile = await store.ensureProfile(foundDeviceId);
    const archives = await store.listArchives(foundDeviceId);
    const aiUsage = await store.getUsage(foundDeviceId, 'ai');

    return NextResponse.json({
      success: true,
      deviceId: foundDeviceId,
      recoveryCode: profile.recoveryCode,
      authorName: profile.authorName,
      presetSlots: profile.presetSlots,
      skins: profile.skins,
      defaultPresetId: profile.defaultPresetId,
      archives,
      aiUsage: {
        used: aiUsage,
        limit: AI_DAILY_LIMIT,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'FAILED_TO_RESTORE_SESSION', detail: String(err) },
      { status: 500 }
    );
  }
}
