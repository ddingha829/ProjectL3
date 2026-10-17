import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/store';
import ShareCardViewer from '@/components/ShareCardViewer';
import { readDeviceId } from '@/lib/session';
import { isUuid } from '@/lib/store';
import { cache } from 'react';

// Sharing currently sends the PNG and map link. An archive UUID must not
// silently make a private diary entry and its owner's presets public.
const ownedRecord = cache(async (id: string) => {
  if (!isUuid(id)) return null;
  const owner = await readDeviceId();
  if (!owner) return null;
  const store = getStore();
  const item = await store.getOwnedArchive(owner, id);
  if (!item) return null;
  const profile = await store.getProfile(owner);
  return profile ? { item, profile } : null;
});

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const record = await ownedRecord(id);
  if (!record) {
    return { title: 'L2. — 카드를 찾을 수 없습니다' };
  }
  const { item, profile } = record;
  return {
    robots: { index: false, follow: false },
    title: `${item.title}${item.score ? ` (★${item.score})` : ''} — ${profile.authorName || 'L2.'} 기록 카드`,
    description: `“${item.quote}” | GOOD: ${item.good} | ${item.addressShort}`,
    openGraph: {
      title: `[L2.] ${item.title}${item.score ? ` ★${item.score}` : ''}`,
      description: `“${item.quote}” — ${item.good}`,
      images: [!item.img || item.img.startsWith('data:') ? '/icons/icon-512.png' : item.img],
    },
  };
}

export default async function ShareCardPage({ params }: SharePageProps) {
  const { id } = await params;
  const record = await ownedRecord(id);

  if (!record) {
    notFound();
  }

  const { item, profile } = record;

  return (
    <ShareCardViewer
      item={item}
      presetSlots={profile.presetSlots}
      skins={profile.skins}
      authorName={profile.authorName || 'L2. ARCHIVE'}
    />
  );
}
