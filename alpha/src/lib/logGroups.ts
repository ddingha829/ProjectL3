import type { ArchiveItem } from '@/types/l2';

export const MAX_GROUP_MEMBERS = 20;
export const isLogGroup = (item: Pick<ArchiveItem, 'kind' | 'cat'>) => item.kind === 'group' || item.cat === 'GROUP';

export function getGroupMembers(item: ArchiveItem, archives: ArchiveItem[]): ArchiveItem[] {
  if (!isLogGroup(item)) return [];
  const index = new Map(archives.filter(entry => !isLogGroup(entry)).map(entry => [entry.id, entry]));
  return (item.memberIds || []).map(id => index.get(id)).filter((entry): entry is ArchiveItem => Boolean(entry));
}
