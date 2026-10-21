'use client';
import type { ArchiveItem } from '@/types/l2';
import { downloadCardFile } from './cardExport';

export interface BackupProgress { percent: number; label: string }
export const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  // Do not let titles/notes turn into formulas when a CSV is opened in Excel.
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
const safeName = (text: string) => text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 65) || 'log';

/** Entirely client-side: no server endpoint receives photos or a ZIP job. */
export async function exportLogbookZip(archives: readonly ArchiveItem[], update: (progress: BackupProgress) => void): Promise<{ missing: number }> {
  update({ percent: 0, label: '로그 데이터 준비 중' });
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const snapshot = archives.map(item => ({ ...item }));
  const photos = new Map<string, string>();
  const missing: Array<{ id: string; url: string }> = [];
  const references: Record<string, string> = {};
  const items = snapshot.filter(item => item.img && item.hasPhoto !== false);
  let bytes = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (photos.has(item.img)) references[item.id] = photos.get(item.img)!;
    else {
      try {
        const url = new URL(item.img, window.location.href);
        if (!['https:', 'http:', 'data:'].includes(url.protocol)) throw new Error('Invalid image');
        const response = await fetch(url.href, { signal: AbortSignal.timeout(15000), credentials: url.origin === window.location.origin ? 'same-origin' : 'omit' });
        if (!response.ok) throw new Error('Image unavailable');
        const blob = await response.blob();
        if (!blob.type.startsWith('image/') || blob.size > 20 * 1024 * 1024) throw new Error('Invalid image');
        bytes += blob.size;
        if (bytes > 250 * 1024 * 1024) throw new RangeError('사진 총 용량이 커서 한 번에 백업할 수 없어요. 기존 JSON 백업을 먼저 보관해 주세요.');
        const extension = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg';
        const filename = `images/${safeName(item.title)}_${safeName(item.id)}.${extension}`;
        zip.file(filename, blob, { compression: 'STORE' });
        photos.set(item.img, filename); references[item.id] = filename;
      } catch (error) {
        if (error instanceof RangeError) throw error;
        missing.push({ id: item.id, url: item.img });
      }
    }
    update({ percent: Math.round((i + 1) / Math.max(1, items.length) * 75), label: `사진 준비 중 · ${i + 1} / ${items.length}` });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  const keys = ['id','title','cat','date','timestamp','occurredAt','quote','score','loc','addressShort','fullAddress','good','bad','note','link','memberIds'] as const;
  const rows = [keys.map(csvCell).join(',') + ',"image_file","latitude","longitude"', ...snapshot.map(item => [...keys.map(key => csvCell(Array.isArray(item[key]) ? item[key]!.join(';') : item[key])), csvCell(references[item.id] || ''), csvCell(item.coordinates?.lat), csvCell(item.coordinates?.lng)].join(','))];
  zip.file('logs.csv', '\ufeff' + rows.join('\r\n'));
  zip.file('logs.json', JSON.stringify(snapshot, null, 2));
  zip.file('manifest.json', JSON.stringify({ exportedAt: new Date().toISOString(), images: references, unavailableImages: missing }, null, 2));
  zip.file('README.txt', `L2 로그북 백업\n로그 ${snapshot.length}개, 사진 ${photos.size}장\nlogs.csv: 엑셀에서 열 수 있는 목록\nlogs.json: 카드 디자인을 포함한 전체 데이터\nmanifest.json: 사진 경로와 다운로드하지 못한 원본 URL\n${missing.length ? `외부 연결 문제로 사진 ${missing.length}장을 포함하지 못했습니다. 원본 URL은 보관했습니다.\n` : ''}`);
  update({ percent: 75, label: 'ZIP 파일 압축 중' });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 }, streamFiles: true }, metadata => update({ percent: Math.min(99, Math.round(75 + metadata.percent * .24)), label: 'ZIP 파일 압축 중' }));
  update({ percent: 100, label: '다운로드 준비 완료' });
  downloadCardFile(new File([blob], `L2_Logbook_${new Date().toISOString().slice(0, 10)}.zip`, { type: 'application/zip' }));
  return { missing: missing.length };
}
