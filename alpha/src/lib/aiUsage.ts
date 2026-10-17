import { AI_DAILY_LIMIT, type L2Store } from '@/lib/store';
import { getRuntimeEnvKey } from '@/lib/env';

/** Reserve before generation so concurrent requests and failed responses count. */
export async function reserveAiUsage(store: L2Store, ownerId: string, hasInput = true) {
  await store.ensureProfile(ownerId);
  let used = await store.getUsage(ownerId, 'ai');
  if (used >= AI_DAILY_LIMIT) return { used: AI_DAILY_LIMIT, allowed: false, limitReached: true };
  if (!hasInput || !getRuntimeEnvKey('GEMINI_API_KEY')) return { used, allowed: false, limitReached: false };
  used = await store.bumpUsage(ownerId, 'ai');
  return { used: Math.min(used, AI_DAILY_LIMIT), allowed: used <= AI_DAILY_LIMIT, limitReached: used > AI_DAILY_LIMIT };
}
