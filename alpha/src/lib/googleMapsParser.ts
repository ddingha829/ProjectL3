import type { ArchiveCategory, ArchiveItem, PlaceInboxItem } from '@/types/l2';
import { getArchiveCategory } from '@/lib/archiveCategories';

export function inferPlaceCategory(title: string, address = '', note = ''): ArchiveCategory {
  const text = `${title} ${address} ${note}`.toLowerCase();
  if (/(영화|극장|시네마|cgv|메가박스|롯데시네마|cinema|film|theater|movie)/i.test(text)) return 'CINEMA';
  if (/(미술관|박물관|갤러리|전시|뮤지엄|아트|공원|산책|서점|전망대|gallery|museum|art|park|book)/i.test(text)) return 'ART';
  if (/(식당|맛집|카페|커피|베이커리|와인|바|비스트로|이자카야|파스타|레스토랑|국밥|고기|초밥|스시|cafe|coffee|bakery|bar|wine|dining|restaurant|bistro)/i.test(text)) return 'DINING';
  return 'DINING';
}

export function extractLocationTags(address: string, title: string): { addressShort: string; loc: string } {
  const cleaned = address.replace(/^대한민국\s*/, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const addressShort = parts.slice(0, 3).join(' ') || cleaned || title;

  let loc = 'SEOUL';
  const combined = `${cleaned} ${title}`;
  if (/성수|성동/.test(combined)) loc = 'SEONGSU';
  else if (/한남|이태원|용산/.test(combined)) loc = 'HANNAM';
  else if (/연남|홍대|합정|망원|마포/.test(combined)) loc = 'YEONNAM';
  else if (/강남|압구정|신사|청담|역삼/.test(combined)) loc = 'GANGNAM';
  else if (/을지로|종로|안국|북촌|서촌|광화문/.test(combined)) loc = 'JONGNO';
  else if (/여의도|영등포|문래/.test(combined)) loc = 'YEOUIDO';
  else if (/잠실|송파/.test(combined)) loc = 'JAMSIL';
  else if (/부산|해운대|광안리|전포/.test(combined)) loc = 'BUSAN';
  else if (/제주|서귀포/.test(combined)) loc = 'JEJU';
  else if (/순천|여수|전주|광주/.test(combined)) loc = 'JEONNAM';
  else if (/경기|성남|분당|수원|일산|파주/.test(combined)) loc = 'GYEONGGI';
  else if (parts[0]) loc = parts[0].slice(0, 12).toUpperCase();

  return { addressShort, loc };
}

export function parseGoogleTakeoutPlaces(rawText: string): PlaceInboxItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('JSON 파일을 읽지 못했어요. 구글 테이크아웃 Saved Places.json 파일인지 확인해 주세요.');
  }

  const root = parsed as Record<string, unknown>;
  const features = Array.isArray(root?.features)
    ? (root.features as Record<string, unknown>[])
    : Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : [];

  if (!features.length) {
    throw new Error('가져올 장소가 없어요. 비어 있지 않은 장소 목록 파일을 선택해 주세요.');
  }

  const results: PlaceInboxItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < features.length; i++) {
    const entry = features[i];
    if (!entry || typeof entry !== 'object') continue;
    const props = (entry.properties && typeof entry.properties === 'object' ? entry.properties : entry) as Record<string, unknown>;
    const geom = (entry.geometry && typeof entry.geometry === 'object' ? entry.geometry : {}) as Record<string, unknown>;
    const locationObj = (props.location && typeof props.location === 'object' ? props.location : {}) as Record<string, unknown>;

    const rawTitle = String(props.title || locationObj.name || props.name || '').trim();
    if (!rawTitle) continue;

    const address = String(locationObj.address || props.address || props.fullAddress || '').trim();
    const coords = Array.isArray(geom.coordinates) ? geom.coordinates : [];
    const rawLng = Number(coords[0] ?? props.lng ?? 126.978);
    const rawLat = Number(coords[1] ?? props.lat ?? 37.5665);
    const lat = Number.isFinite(rawLat) && Math.abs(rawLat) <= 90 ? rawLat : 37.5665;
    const lng = Number.isFinite(rawLng) && Math.abs(rawLng) <= 180 ? rawLng : 126.978;
    const googleMapsUrl = String(
      props.google_maps_url ||
        props.url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawTitle)}`
    ).trim();
    const note = String(props.note || props.comment || props.quote || '').trim();

    const dedupeKey = `${rawTitle.toLowerCase()}::${address.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const { addressShort, loc } = extractLocationTags(address, rawTitle);
    const category = inferPlaceCategory(rawTitle, address, note);

    results.push({
      id: `inbox_${Date.now()}_${i}`,
      title: rawTitle.slice(0, 120),
      address: address.slice(0, 240),
      addressShort: addressShort.slice(0, 80),
      loc,
      lat,
      lng,
      googleMapsUrl,
      note: note ? note.slice(0, 500) : undefined,
      category,
      importedAt: Date.now(),
    });
  }

  if (!results.length) {
    throw new Error('유효한 장소 정보를 찾지 못했어요.');
  }

  return results;
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/[",]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildGoogleMapsCsv(archives: ArchiveItem[]): string {
  const headers = ['Title', 'Category', 'Score', 'Address', 'Location', 'Latitude', 'Longitude', 'Quote', 'Good', 'Bad', 'Note', 'Date', 'URL'];
  const rows = archives
    .filter((item) => item.cat !== 'GROUP')
    .map((item) => [
      item.title,
      getArchiveCategory(item.cat).label,
      item.score || '',
      item.fullAddress || item.addressShort || item.loc || '',
      item.loc || '',
      item.coordinates ? String(item.coordinates.lat) : '',
      item.coordinates ? String(item.coordinates.lng) : '',
      item.quote || '',
      item.good || '',
      item.bad || '',
      item.note || '',
      item.date || '',
      item.link || '',
    ]);

  return '\uFEFF' + [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function buildNotionMarkdown(archives: ArchiveItem[]): string {
  const items = archives.filter((item) => item.cat !== 'GROUP');
  if (!items.length) return '# L2. 로그북 아카이브\n\n기록된 로그가 없습니다.';
  const lines: string[] = [
    '# L2. 로그북 아카이브',
    `> 내보낸 날짜: ${new Date().toLocaleDateString('ko-KR')} · 총 ${items.length}개의 기록`,
    '',
  ];
  for (const item of items) {
    const catLabel = getArchiveCategory(item.cat).label;
    const scoreBadge = item.score ? ` · ★ ${item.score}` : '';
    lines.push(`## ${item.title}`);
    lines.push(`- **분류**: ${catLabel}${scoreBadge}`);
    lines.push(`- **날짜**: ${item.date}`);
    if (item.fullAddress || item.addressShort || item.loc) {
      lines.push(`- **장소**: ${item.fullAddress || item.addressShort || item.loc}`);
    }
    if (item.link) {
      lines.push(`- **링크**: ${item.link}`);
    }
    if (item.quote) {
      lines.push(`\n> ${item.quote.replace(/\n/g, '\n> ')}\n`);
    }
    if (item.good) lines.push(`- **좋았던 점**: ${item.good}`);
    if (item.bad) lines.push(`- **아쉬웠던 점**: ${item.bad}`);
    if (item.note) lines.push(`- **다음의 나에게**: ${item.note}`);
    lines.push('\n---\n');
  }
  return lines.join('\n');
}

export function triggerTextDownload(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
