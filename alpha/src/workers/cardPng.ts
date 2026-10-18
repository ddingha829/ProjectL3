import { encode } from 'upng-js';

// Quantize off the UI thread. PNG keeps the transparent card outline, unlike JPEG.
self.onmessage = (event: MessageEvent<{ pixels: ArrayBuffer; width: number; height: number }>) => {
  try {
    const { pixels, width, height } = event.data;
    const png = encode([pixels], width, height, 256);
    self.postMessage({ png }, { transfer: [png] });
  } catch {
    self.postMessage({ error: '카드 PNG 압축을 완료하지 못했어요. 다시 시도해 주세요.' });
  }
};
