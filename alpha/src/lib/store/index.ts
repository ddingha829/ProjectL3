import 'server-only';
import { fileStore } from './fileStore';
import { getSupabaseConfig, supabaseStore } from './supabaseStore';
import { L2Store } from './types';

export type { L2Store, Profile, ProfilePrefs } from './types';
export { isUuid, newId, normalizeRecoveryCode } from './util';

/** Daily AI calls per device (skin + memo extraction). */
export const AI_DAILY_LIMIT = 20;
/** Silent cap on Gemini-backed place lookups (fires while typing). */
export const PLACES_AI_DAILY_LIMIT = 60;

export function getStore(): L2Store {
  return getSupabaseConfig() ? supabaseStore : fileStore;
}
