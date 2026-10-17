import fs from 'fs';
import path from 'path';

let cachedFileEnv: Record<string, string> | null = null;
let cachedMtime = 0;

/**
 * Reads an env var, falling back to `.env.local` on disk so keys edited
 * while `next dev` is running are picked up without a restart.
 */
export function getRuntimeEnvKey(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return undefined;
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
    return cachedFileEnv[key];
  } catch {
    return undefined;
  }
}
