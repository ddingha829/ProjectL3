import { INITIAL_SKINS } from '@/data/initialData';
import type { SkinTheme } from '@/types/l2';

/** Tombstones survive the merge with bundled colors on reload and other devices. */
export function visibleSkins(skins: Record<string, SkinTheme>): Record<string, SkinTheme> {
  return Object.fromEntries(Object.entries({ ...INITIAL_SKINS, ...skins }).filter(([, skin]) => !skin.hidden));
}

export function fallbackSkinId(skins: Record<string, SkinTheme>): string {
  const visible = visibleSkins(skins);
  return visible.paper ? 'paper' : Object.keys(visible)[0] || 'paper';
}
