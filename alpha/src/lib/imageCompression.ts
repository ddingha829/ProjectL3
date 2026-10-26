'use client';

export const PHOTO_MAX_WIDTH = 1080;
export const PHOTO_MAX_BYTES = 300 * 1024;
export const CARD_MAX_BYTES = 500 * 1024;
let webpReady: Promise<unknown> | undefined;

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('이미지 변환을 완료하지 못했어요.')), type, quality));
}

async function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const native = await canvasBlob(canvas, 'image/webp', quality);
  if (native.type === 'image/webp') return native;
  const codec = await import('@jsquash/webp/encode');
  webpReady ||= codec.init({ locateFile: (name: string) => `/codecs/${name}` }).catch(error => { webpReady = undefined; throw error; });
  await webpReady;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('사진을 변환할 수 없는 브라우저예요.');
  return new Blob([await codec.default(context.getImageData(0, 0, canvas.width, canvas.height), { quality: quality * 100 })], { type: 'image/webp' });
}

/** Never returns an uncompressed original on failure. Small files are not padded. */
export async function compressPhotoBlob(file: Blob, maxWidth = PHOTO_MAX_WIDTH, quality = .8): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일을 선택해 주세요.');
  if (file.size > 30 * 1024 * 1024) throw new Error('30MB 이하의 사진을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('사진 크기를 확인하지 못했어요.');
    let scale = Math.min(1, maxWidth / image.naturalWidth, 2160 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    for (let attempt = 0; attempt < 9; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('사진을 준비하지 못했어요.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await encodeWebp(canvas, quality);
      if (blob.size <= PHOTO_MAX_BYTES) return blob;
      scale *= Math.min(.9, Math.sqrt(PHOTO_MAX_BYTES / blob.size) * .94);
    }
    throw new Error('사진을 300KB 이하로 줄이지 못했어요. 다른 사진을 선택해 주세요.');
  } catch (error) {
    throw new Error(error instanceof Error && /사진|MB|KB|브라우저/.test(error.message) ? error.message : '사진을 읽지 못했어요. JPG, PNG, WebP로 다시 선택해 주세요.');
  } finally { URL.revokeObjectURL(url); }
}

async function encodeCardPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('카드 이미지를 준비하지 못했어요.');
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data.buffer;
  const worker = new Worker(new URL('../workers/cardPng.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('카드 압축이 지연되고 있어요. 다시 시도해 주세요.')), 20000);
      worker.onmessage = (event: MessageEvent<{ png?: ArrayBuffer; error?: string }>) => {
        clearTimeout(timer);
        if (event.data.png) resolve(new Blob([event.data.png], { type: 'image/png' }));
        else reject(new Error(event.data.error || '카드를 압축하지 못했어요.'));
      };
      worker.onerror = () => { clearTimeout(timer); reject(new Error('카드 압축을 시작하지 못했어요. 다시 시도해 주세요.')); };
      worker.postMessage({ pixels, width: canvas.width, height: canvas.height }, [pixels]);
    });
  } finally { worker.terminate(); }
}

/** Load the worker and its chunks while online so PNG exports remain usable offline. */
export async function warmCardPngEncoder(): Promise<void> {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  await encodeCardPng(canvas);
}

/** Preserve transparent rounded corners / cutouts in a shareable PNG.
 * Try lossless first, then palette compression before reducing dimensions.
 */
export async function compressCardBlob(source: Blob): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const image = new Image(); image.src = url; await image.decode();
    let scale = Math.min(1, PHOTO_MAX_WIDTH / image.naturalWidth);
    const canvas = document.createElement('canvas');
    const minimumScale = Math.min(scale, 720 / image.naturalWidth);
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('카드 이미지를 준비하지 못했어요.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (attempt === 0) {
        const lossless = await canvasBlob(canvas, 'image/png', 1);
        if (lossless.size <= CARD_MAX_BYTES) return lossless;
      }
      const compressed = await encodeCardPng(canvas);
      if (compressed.size <= CARD_MAX_BYTES) return compressed;
      if (scale <= minimumScale) break;
      scale = Math.max(minimumScale, scale * Math.min(.9, Math.sqrt(CARD_MAX_BYTES / compressed.size) * .94));
    }
    throw new Error('카드를 500KB 이하로 만들지 못했어요. 질감 옵션을 끄고 다시 시도해 주세요.');
  } finally { URL.revokeObjectURL(url); }
}
