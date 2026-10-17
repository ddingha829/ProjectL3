import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/store';
import ShareCardViewer from '@/components/ShareCardViewer';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const store = getStore();
  const record = await store.getPublicArchive(id);
  if (!record) {
    return { title: 'L2. — 카드를 찾을 수 없습니다' };
  }
  const { item, profile } = record;
  return {
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
  const store = getStore();
  const record = await store.getPublicArchive(id);

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
