import { NextRequest, NextResponse } from 'next/server';
import { requireDevice } from '@/lib/session';
import { getStore } from '@/lib/store';

export async function DELETE(request: NextRequest) {
  try {
    const { deviceId } = await requireDevice();
    const body = await request.json();
    if (body?.confirmation !== 'DELETE_ALL_LOGS' || !body.expectedDeviceId) return NextResponse.json({ error: 'CONFIRMATION_REQUIRED' }, { status: 400 });
    if (body.expectedDeviceId !== deviceId) return NextResponse.json({ error: 'DEVICE_CHANGED' }, { status: 409 });
    await getStore().deleteAllArchives(deviceId);
    return NextResponse.json({ archives: [], deviceId });
  } catch { return NextResponse.json({ error: '초기화하지 못했어요. 연결을 확인하고 다시 시도해 주세요.' }, { status: 500 }); }
}
