export type MediaKind = 'movie' | 'tv' | 'book';
export interface MediaResult {
  id: number | string; type: MediaKind; title: string; poster: string;
  overview: string; rating: number; year: string;
  authors?: string[]; publisher?: string; isbn?: string; url?: string;
}
export interface LogMedia { id: string; type: MediaKind; title: string; url?: string; authors?: string[]; publisher?: string; isbn?: string }
export const plainMediaText = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity] || '')).replace(/\s+/g, ' ').trim() : '';
export function briefMediaText(value: unknown): string {
  const text = plainMediaText(value);
  const sentences = text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [text];
  const brief = sentences.slice(0, 2).map(sentence => sentence.trim()).join(' ').trim();
  if (brief.length <= 160) return brief;
  const cut = brief.slice(0, 157), space = cut.lastIndexOf(' ');
  return cut.slice(0, space > 110 ? space : 157).replace(/[,.\s]+$/, '') + '…';
}
export function normalizeLogMedia(value: unknown): LogMedia | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as Partial<LogMedia>;
  if (!['movie','tv','book'].includes(v.type || '') || !['string','number'].includes(typeof v.id) || !v.title) return;
  const url = typeof v.url === 'string' && /^https:\/\//.test(v.url) ? v.url.slice(0, 2000) : undefined;
  return { id: String(v.id).slice(0,80), type: v.type!, title: plainMediaText(v.title).slice(0,200), url,
    ...(Array.isArray(v.authors) ? { authors: v.authors.filter(name => typeof name === 'string').slice(0,10).map(name => plainMediaText(name).slice(0,80)) } : {}),
    ...(v.publisher ? { publisher: plainMediaText(v.publisher).slice(0,100) } : {}),
    ...(v.isbn ? { isbn: String(v.isbn).replace(/[^\dXx ]/g,'').slice(0,40) } : {}) };
}
