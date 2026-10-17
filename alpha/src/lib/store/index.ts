import 'server-only';
import { fileStore } from './fileStore';
import { getSupabaseConfig, supabaseStore } from './supabaseStore';
import { L2Store } from './types';

export type { L2Store, Profile, ProfilePrefs } from './types';
export { isUuid, newId, normalizeRecoveryCode } from './util';

/** Daily AI generation allowance (skin + memo + place fallback). */
export const AI_DAILY_LIMIT = 20;

export function getStore(): L2Store {
  const configured = getSupabaseConfig();
  if (process.env.VERCEL && !configured) throw new Error('서버 저장소 설정을 확인해 주세요. 기록은 기기에 보관됩니다.');
  return configured ? supabaseStore : fileStore;
}
