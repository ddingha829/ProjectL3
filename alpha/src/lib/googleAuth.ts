import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { getRuntimeEnvKey } from './env';

export const GOOGLE_FLOW_COOKIE = 'l2_google_flow';
export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

export function googleAuthConfig() {
  const url = getRuntimeEnvKey('SUPABASE_URL') || getRuntimeEnvKey('NEXT_PUBLIC_SUPABASE_URL');
  // The service key is never exposed to the browser or passed to Google.
  const key = getRuntimeEnvKey('SUPABASE_ANON_KEY') || getRuntimeEnvKey('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return url && key ? { url, key } : null;
}

export async function googleAuthAvailable() {
  const config = googleAuthConfig();
  if (!config) return false;
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key }, signal: AbortSignal.timeout(8000), cache: 'no-store',
    });
    const data = await response.json();
    return response.ok && data.external?.google === true;
  } catch { return false; }
}

export function newPkce() {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/** Exchange a single-use PKCE code and verify the identity with Auth, never a client claim. */
export async function verifiedGoogleIdentity(code: string, verifier: string) {
  const config = googleAuthConfig();
  if (!config) throw new Error('GOOGLE_NOT_CONFIGURED');
  const tokenResponse = await fetch(`${config.url}/auth/v1/token?grant_type=pkce`, {
    method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) throw new Error('GOOGLE_CODE_REJECTED');
  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10000), cache: 'no-store',
  });
  const user = await userResponse.json();
  if (!userResponse.ok || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(user.id || '') ||
      !user.identities?.some((identity: { provider?: string }) => identity.provider === 'google')) {
    throw new Error('GOOGLE_IDENTITY_REJECTED');
  }
  return { id: user.id as string, label: String(user.user_metadata?.full_name || user.email || 'Google 사용자').slice(0, 80) };
}
