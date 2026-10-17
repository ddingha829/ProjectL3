import { getRuntimeEnvKey } from './env';

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
];

export interface GeminiGenerateOptions {
  contents: Array<{ parts: Array<{ text: string }> }>;
  responseMimeType?: string;
  timeoutMs?: number;
}

export async function callGemini(
  options: GeminiGenerateOptions
): Promise<{ text: string; model: string } | null> {
  const key = getRuntimeEnvKey('GEMINI_API_KEY');
  if (!key) return null;

  for (const model of CANDIDATE_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
    try {

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: options.contents,
            generationConfig: options.responseMimeType
              ? { responseMimeType: options.responseMimeType }
              : undefined,
          }),
          signal: controller.signal,
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (text) {
          return { text, model };
        }
      } else {
        // If 503 (high demand) or 429, try next model in loop
        console.warn(`[Gemini ${model}] failed with ${res.status}, trying fallback...`);
      }
    } catch (err) {
      console.warn(`[Gemini ${model}] error:`, err);
    } finally { clearTimeout(timer); }
  }

  return null;
}
