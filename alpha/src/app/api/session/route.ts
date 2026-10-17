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
    const username = (await store.getAccountUsername?.(deviceId)) || null;

    return NextResponse.json({
      deviceId,
      username,
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
    const body = (await req.json()) as {
      action?: 'logout';
      username?: string;
      password?: string;
      recoveryCode?: string;
    };

    const store = getStore();

    if (body.action === 'logout') {
      const freshId = newId();
      const profile = await store.ensureProfile(freshId);
      await writeDeviceId(freshId);
      return NextResponse.json({
        success: true,
        deviceId: freshId,
        username: null,
        recoveryCode: profile.recoveryCode,
      });
    }

    if (typeof body.username === 'string' && typeof body.password === 'string') {
      const cleanUser = body.username.trim();
      const cleanPass = body.password.trim();
      if (cleanUser.length < 2 || cleanUser.length > 80) {
        return NextResponse.json(
          { error: '아이디는 2~80글자로 입력해 주세요.' },
          { status: 400 }
        );
      }
      if (cleanPass.length < 4 || cleanPass.length > 256) {
        return NextResponse.json(
          { error: '비밀번호는 4~256글자로 입력해 주세요.' },
          { status: 400 }
        );
      }
      if (!store.loginOrRegister) {
        return NextResponse.json(
          { error: '계정 로그인을 지원하지 않는 저장소입니다.' },
          { status: 500 }
        );
      }

      const previousDeviceId = await readDeviceId();
      try {
        const { accountId, username, isNewAccount } = await store.loginOrRegister(
          cleanUser,
          cleanPass,
          previousDeviceId
        );
        const profile = await store.ensureProfile(accountId);
        const archives = await store.listArchives(accountId);
        const aiUsage = await store.getUsage(accountId, 'ai');
        await writeDeviceId(accountId);
        return NextResponse.json({
          success: true,
          deviceId: accountId,
          username,
          isNewAccount,
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
        if (err instanceof Error && err.message === 'INVALID_PASSWORD') {
          return NextResponse.json(
            { error: '비밀번호가 일치하지 않아요. 다시 확인해 주세요.' },
            { status: 401 }
          );
        }
        throw err;
      }
    }

    const { recoveryCode } = body;
    if (!recoveryCode) {
      return NextResponse.json(
        { error: '아이디/비밀번호 또는 복원 코드를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const normalized = normalizeRecoveryCode(recoveryCode);
    if (!normalized) {
      return NextResponse.json(
        {
          error: '올바른 L2 복구 코드 형식(L2-XXXX-XXXX)이 아닙니다.',
        },
        { status: 400 }
      );
    }

    const foundDeviceId = await store.findDeviceByRecoveryCode(normalized);
    if (!foundDeviceId) {
      return NextResponse.json(
        {
          error: '일치하는 복구 코드를 찾을 수 없습니다.',
        },
        { status: 404 }
      );
    }

    const profile = await store.ensureProfile(foundDeviceId);
    const archives = await store.listArchives(foundDeviceId);
    const aiUsage = await store.getUsage(foundDeviceId, 'ai');
    const username = (await store.getAccountUsername?.(foundDeviceId)) || null;
    await writeDeviceId(foundDeviceId);

    return NextResponse.json({
      success: true,
      deviceId: foundDeviceId,
      username,
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
      { error: '계정 연결에 실패했습니다.', detail: String(err) },
      { status: 500 }
    );
  }
}
