import fs from 'fs';
import path from 'path';

let cachedFileEnv: Record<string, string> | null = null;
let cachedMtime = 0;

/**
 * Reads an env var from process.env (Vercel / production) or `.env.local` on disk.
 * In local dev, if `.env.local` explicitly sets `L2_TEST_ALLOW_EXTERNAL=false`,
 * external keys are suppressed so offline/local fallbacks can be tested.
 */
export function getRuntimeEnvKey(key: string): string | undefined {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const mtime = fs.statSync(envPath).mtimeMs;
      if (!cachedFileEnv || mtime !== cachedMtime) {
        const parsed: Record<string, string> = {};
        for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const k = trimmed.slice(0, eq).trim();
            const v = trimmed.slice(eq + 1).trim();
            if (v) parsed[k] = v;
          }
        }
        cachedFileEnv = parsed;
        cachedMtime = mtime;
      }
      if (cachedFileEnv.L2_TEST_ALLOW_EXTERNAL === 'false') return undefined;
      if (cachedFileEnv[key]) return cachedFileEnv[key];
    }
  } catch {
    // Ignore filesystem errors on serverless platforms
  }

  if (process.env.L2_TEST_ALLOW_EXTERNAL === 'false') return undefined;
  return process.env[key];
}
