import { compressCardBlob } from './imageCompression';
import { toSvg } from 'html-to-image';

interface CardExportOptions { filename?: string; pixelRatio?: number }
interface FontRule { css: string; baseUrl: string; family: string; weight: string; style: string; range: string; src: string }

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
    weight: descriptor(match[1], 'font-weight') || '400', style: descriptor(match[1], 'font-style') || 'normal', range: descriptor(match[1], 'unicode-range'), src: descriptor(match[1], 'src'),
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
    const families=style.fontFamily.split(',').map(part=>part.trim().replace(/["']/g,''));
    // The bundled Sebang face covers Korean and Latin; do not embed unused
    // Pretendard/Inter fallback files in every card. Mono labels stay separate.
    for (const family of families[0]==='Sebang Gothic' ? families.slice(0,1) : families) {
      const usageKey=`${family}|${style.fontStyle==='normal'?'normal':'italic'}`;
      if (!usage.has(usageKey)) usage.set(usageKey, new Set());
      usage.get(usageKey)!.add(Number(style.fontWeight) || 400);
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
        const faceStyle=rule.style==='normal'?'normal':'italic';
        const weights = usage.get(`${rule.family}|${faceStyle}`) || (faceStyle==='normal'&&!rules.some(face=>face.family===rule.family&&face.style!=='normal')?usage.get(`${rule.family}|italic`):undefined);
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

async function decodeImage(image: HTMLImageElement) {
  await withTimeout(image.decode(), '사진 준비가 지연되고 있습니다. 다시 시도해 주세요.');
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('사진을 불러오지 못해 카드를 저장하지 않았습니다.');
}

/** Freeze one export without replacing sources or crop positions in the live preview.
 * html-to-image's resource loader may cache an empty placeholder after a failed
 * CORS request. Strictly embed and decode our own resources before it sees them.
 */
async function imageSnapshot(node: HTMLElement, width: number, height: number) {
  const sourceImages = Array.from(node.querySelectorAll('img'));
  const embedded = new Map<string, Promise<string>>();
  const sources = await Promise.all(sourceImages.map(async image => {
    await decodeImage(image);
    const url = image.currentSrc || image.src;
    let pending = embedded.get(url);
    if (!pending) {
      pending = (async () => {
        if (url.startsWith('data:')) return url;
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(url, { mode: 'cors', cache: 'reload', credentials: 'same-origin', signal: controller.signal });
          if (!response.ok || response.type === 'opaque') throw new Error('사진 원본을 가져오지 못했어요. 네트워크 연결을 확인해 주세요.');
          const blob = await response.blob();
          if (!blob.size) throw new Error('사진 원본이 비어 있어요. 다시 시도해 주세요.');
          return await blobAsDataUrl(blob);
        } finally { clearTimeout(timer); }
      })();
      embedded.set(url, pending);
    }
    return pending;
  }));
  const snapshot = node.cloneNode(true) as HTMLElement;
  snapshot.removeAttribute('data-card-capture');
  const images = Array.from(snapshot.querySelectorAll('img'));
  images.forEach((image, index) => {
    image.removeAttribute('srcset'); image.removeAttribute('sizes'); image.removeAttribute('crossorigin');
    image.loading = 'eager'; image.decoding = 'sync'; image.src = sources[index];
  });
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true'); host.inert = true;
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: `${width}px`, height: `${height}px`, pointerEvents: 'none' });
  host.appendChild(snapshot); document.body.appendChild(host);
  try { await Promise.all(images.map(decodeImage)); }
  catch (error) { host.remove(); throw error; }
  return { snapshot, cleanup: () => host.remove() };
}

async function renderSnapshot(snapshot: HTMLElement, width: number, height: number, fontEmbedCSS: string, pixelRatio?: number) {
  const style = getComputedStyle(snapshot);
  const corners = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(value => parseFloat(value) || 0);
  const notchRadius = parseFloat(style.getPropertyValue('--card-notch-radius')) || 0;
  const notchY = height * (parseFloat(style.getPropertyValue('--card-notch-y')) || 0) / 100;
  const svg = await withTimeout(toSvg(snapshot, { width, height, fontEmbedCSS, preferredFontFormat: 'woff2',
    style: { animation: 'none', transition: 'none', transform: 'none', boxShadow: 'none', mask: 'none', webkitMask: 'none' },
  }), '카드 이미지 생성이 지연되고 있습니다. 다시 시도해 주세요.', 30000);
  const image = new Image(); image.src = svg; await decodeImage(image);
  const ratio = Math.min(1080 / width, pixelRatio ?? 1080 / width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('카드 이미지를 준비하지 못했어요.');
  // WebKit's SVG foreignObject can flatten a CSS radius/mask. Apply the card's
  // outline on the final canvas so every engine exports actual transparent pixels.
  const paint = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(canvas.width / width, canvas.height / height);
    context.beginPath(); context.roundRect(0, 0, width, height, corners); context.clip();
    context.drawImage(image, 0, 0, width, height);
    if (notchRadius > 0) {
      context.globalCompositeOperation = 'destination-out';
      for (const x of [0, width]) {
        const cutout = context.createRadialGradient(x, notchY, Math.max(0, notchRadius - 1), x, notchY, notchRadius);
        cutout.addColorStop(0, '#000'); cutout.addColorStop(1, '#0000');
        context.fillStyle = cutout;
        context.fillRect(x - notchRadius, notchY - notchRadius, notchRadius * 2, notchRadius * 2);
      }
    }
    context.restore();
  };
  paint();
  // WebKit can report a loaded SVG before its foreignObject photos are painted.
  // Repaint the SAME decoded SVG after a warm-up; never re-fetch remote photos.
  if (/AppleWebKit/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Android/i.test(navigator.userAgent)) {
    await new Promise<void>(resolve => setTimeout(resolve, 150));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    paint();
  }
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('카드 이미지를 생성하지 못했습니다. 다시 시도해 주세요.')), 'image/png'));
}

export function prepareCardExport(node: HTMLElement, options: CardExportOptions = {}): Promise<{ blob: Blob; file: File }> {
  const pending = (async () => {
    const animations = node.getAnimations?.({ subtree: true }).filter((animation) => animation.playState === 'running') || [];
    animations.forEach((animation) => animation.pause());
    try {
      const width = Number(node.dataset.cardWidth) || node.offsetWidth;
      const height = Number(node.dataset.cardHeight) || node.offsetHeight;
      const fontEmbedCSS = await prepareFonts(node);
      const { snapshot, cleanup } = await imageSnapshot(node, width, height);
      let rendered: Blob;
      try { rendered = await renderSnapshot(snapshot, width, height, fontEmbedCSS, options.pixelRatio); }
      finally { cleanup(); }
      const blob = await compressCardBlob(rendered);
      const filename = (options.filename || 'L2_card.png').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
      return { blob, file: new File([blob], `${filename.replace(/\.(png|jpe?g|webp)$/i,'')}.png`, { type: blob.type }) };
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
