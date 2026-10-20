export type AppFont = 'sebang' | 'pretendard' | 'gaegu';

export function normalizeAppFont(value: unknown): AppFont {
  return value === 'pretendard' || value === 'gaegu' ? value : 'sebang';
}
