import { compressCardBlob } from './imageCompression';
import { toBlob } from 'html-to-image';

interface CardExportOptions { filename?: string; pixelRatio?: number }
interface FontRule { css: string; baseUrl: string; family: string; weight: string; range: string; src: string }

const fontFileCache = new Map<string, Promise<string>>();
const fontCssCache = new Map<string, Promise<string>>();
const sheetCache = new Map<string, Promise<FontRule[]>>();

function withTimeout<T>(promise: Promise<T>, message: string, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]).finally(() => clearTimeout(timer));
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('이미지 리소스를 읽지 못했습니다. 다시 시도해 주세요.'));
    reader.readAsDataURL(blob);
  });
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Resource request failed: ${response.status}`);
    return await response.text();
  } finally { clearTimeout(timer); }
}

function descriptor(css: string, name: string): string {
  return css.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i'))?.[1].trim() || '';
}

function parseFaces(css: string, baseUrl: string): FontRule[] {
  return Array.from(css.matchAll(/@font-face\s*\{([^}]+)\}/gi), (match) => ({
    css: match[1], baseUrl, family: descriptor(match[1], 'font-family').replace(/["']/g, '').trim(),
    weight: descriptor(match[1], 'font-weight') || '400', range: descriptor(match[1], 'unicode-range'), src: descriptor(match[1], 'src'),
  }));
}

async function externalFaces(url: string): Promise<FontRule[]> {
  let pending = sheetCache.get(url);
  if (!pending) {
    pending = (async () => {
      const css = await fetchText(url);
      const imports = Array.from(css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/gi), (match) => new URL(match[1], url).href);
      const imported = await Promise.all(imports.map(externalFaces));
      return [...parseFaces(css, url), ...imported.flat()];
    })();
    sheetCache.set(url, pending);
    pending.catch(() => sheetCache.delete(url));
  }
  return pending;
}

async function collectFaces(): Promise<FontRule[]> {
  const read = async (sheet: CSSStyleSheet): Promise<FontRule[]> => {
    const baseUrl = sheet.href || document.baseURI;
    try {
      const result: FontRule[] = [];
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule.type === CSSRule.FONT_FACE_RULE) result.push(...parseFaces(rule.cssText, baseUrl));
        if (rule.type === CSSRule.IMPORT_RULE) {
          const imported = rule as CSSImportRule;
          if (imported.styleSheet) result.push(...await read(imported.styleSheet));
        }
      }
      return result;
    } catch {
      if (!sheet.href) return [];
      return externalFaces(sheet.href);
    }
  };
  return (await Promise.all(Array.from(document.styleSheets, read))).flat();
}

function includesText(range: string, text: string): boolean {
  if (!range) return true;
  const intervals = range.split(',').map((part) => {
    const value = part.trim().replace(/^U\+/i, '');
    if (value.includes('?')) return [parseInt(value.replace(/\?/g, '0'), 16), parseInt(value.replace(/\?/g, 'F'), 16)];
    const [start, end] = value.split('-');
    return [parseInt(start, 16), parseInt(end || start, 16)];
  });
  return Array.from(text).some((character) => {
    const code = character.codePointAt(0)!;
    return intervals.some(([start, end]) => code >= start && code <= end);
  });
}

async function embedFace(rule: FontRule): Promise<string> {
  const sources = Array.from(rule.src.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)(?:\s*format\(([^)]+)\))?/gi));
  const source = sources.find((match) => /woff2/i.test(`${match[1]} ${match[2] || ''}`)) || sources[0];
  if (!source) return '';
  const url = new URL(source[1], rule.baseUrl).href;
  let pending = fontFileCache.get(url);
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
        return await blobAsDataUrl(await response.blob());
      } finally { clearTimeout(timer); }
    })();
    fontFileCache.set(url, pending);
    pending.catch(() => fontFileCache.delete(url));
  }
  const dataUrl = await pending;
  return `@font-face{${rule.css.replace(/src\s*:[^;]+;?/i, '')};src:url("${dataUrl}");font-display:block;}`;
}

/** Embed only font weights and Unicode subsets used by this card, rather than all 92 Korean subsets. */
async function prepareFonts(node: HTMLElement): Promise<string> {
  const usage = new Map<string, Set<number>>();
  for (const element of [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))]) {
    const style = getComputedStyle(element);
    for (const family of style.fontFamily.split(',').map((part) => part.trim().replace(/["']/g, ''))) {
      if (!usage.has(family)) usage.set(family, new Set());
      usage.get(family)!.add(Number(style.fontWeight) || 400);
    }
  }
  const text = Array.from(new Set(Array.from(node.textContent || ''))).sort().join('');
  const key = JSON.stringify([Array.from(usage, ([family, weights]) => [family, Array.from(weights).sort()]), text, Array.from(document.styleSheets, (sheet) => sheet.href)]);
  let pending = fontCssCache.get(key);
  if (!pending) {
    pending = (async () => {
      await withTimeout(document.fonts.ready, '글꼴 준비가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
      const rules = await collectFaces();
      const selected = rules.filter((rule) => {
        const weights = usage.get(rule.family);
        if (!weights || !includesText(rule.range, text)) return false;
        const numbers = rule.weight.split(/\s+/).map(Number);
        if (!numbers.every(Number.isFinite)) return true;
        const [minimum, maximum = minimum] = numbers;
        return Array.from(weights).some((weight) => weight >= minimum && weight <= maximum);
      });
      const unique = Array.from(new Map(selected.map((rule) => [`${rule.family}:${rule.weight}:${rule.range}:${rule.src}`, rule])).values());
      return (await Promise.all(unique.map(embedFace))).join('\n');
    })();
    if (fontCssCache.size > 24) fontCssCache.delete(fontCssCache.keys().next().value!);
    fontCssCache.set(key, pending);
    pending.catch(() => fontCssCache.delete(key));
  }
  return pending;
}

async function prepareImages(node: HTMLElement) {
  await Promise.all(Array.from(node.querySelectorAll('img'), async (image) => {
    if (image.decode) await withTimeout(image.decode(), '사진 준비가 지연되고 있습니다. 다시 시도해 주세요.');
    else if (!image.complete) await withTimeout(new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error('사진을 불러오지 못했습니다.')), { once: true });
    }), '사진 준비가 지연되고 있습니다.');
    if (!image.naturalWidth) throw new Error('사진을 불러오지 못해 카드를 저장하지 않았습니다.');
  }));
}

export function prepareCardExport(node: HTMLElement, options: CardExportOptions = {}): Promise<{ blob: Blob; file: File }> {
  const pending = (async () => {
    const animations = node.getAnimations?.({ subtree: true }).filter((animation) => animation.playState === 'running') || [];
    animations.forEach((animation) => animation.pause());
    try {
      const [fontEmbedCSS] = await Promise.all([prepareFonts(node), prepareImages(node)]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const width = Number(node.dataset.cardWidth) || node.offsetWidth;
      const height = Number(node.dataset.cardHeight) || node.offsetHeight;
      // CDN images first loaded by <img> can be cached without CORS headers.
      // Reload the resource in CORS fetch mode before embedding it into the canvas.
      const rendered = await withTimeout(toBlob(node, { width, height, pixelRatio: Math.min(1080 / width, options.pixelRatio ?? 1080 / width), fontEmbedCSS, preferredFontFormat: 'woff2', cacheBust: false, includeQueryParams: true, fetchRequestInit: { cache: 'reload' }, style: { animation: 'none', transition: 'none', transform: 'none', boxShadow: 'none' } }), '카드 이미지 생성이 지연되고 있습니다. 다시 시도해 주세요.', 30000);
      if (!rendered || !rendered.size) throw new Error('카드 이미지를 생성하지 못했습니다. 다시 시도해 주세요.');
      const blob = await compressCardBlob(rendered);
      const filename = (options.filename || 'L2_card.png').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
      return { blob, file: new File([blob], `${filename.replace(/\.(png|jpe?g|webp)$/i,'')}.jpg`, { type: blob.type }) };
    } catch (error) {
      throw new Error(error instanceof Error ? `카드 저장 실패: ${error.message}` : '카드를 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally { animations.forEach((animation) => animation.play()); }
  })();
  return pending;
}

export function downloadCardFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function isShareCanceled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
