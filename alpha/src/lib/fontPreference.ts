export type AppFont = 'sebang' | 'pretendard' | 'gaegu' | 'single-day';

export function normalizeAppFont(value: unknown): AppFont {
  return value === 'pretendard' || value === 'gaegu' || value === 'single-day' ? value : 'sebang';
}
