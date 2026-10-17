import { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';

export interface Profile {
  id: string;
  recoveryCode: string;
  authorName: string;
  presetSlots: PresetSlot[];
  skins: Record<string, SkinTheme>;
  defaultPresetId: string;
}

export type ProfilePrefs = Partial<
  Pick<Profile, 'authorName' | 'presetSlots' | 'skins' | 'defaultPresetId'>
> & { replaceSkins?: boolean };

export type AiUsageKind = 'ai' | 'places';

export interface L2Store {
  readonly kind: 'supabase' | 'file';
  ensureProfile(deviceId: string): Promise<Profile>;
  getProfile(deviceId: string): Promise<Profile | null>;
  findDeviceByRecoveryCode(code: string): Promise<string | null>;
  savePrefs(deviceId: string, prefs: ProfilePrefs): Promise<Profile>;

  listArchives(ownerId: string): Promise<ArchiveItem[]>;
  getOwnedArchive(ownerId: string, id: string): Promise<ArchiveItem | null>;
  /** Inserts or updates. Updates are silently ignored if the id belongs to someone else. */
  saveArchive(ownerId: string, item: ArchiveItem): Promise<ArchiveItem | null>;
  deleteArchive(ownerId: string, id: string): Promise<void>;
  /** Public read for share pages — no ownership check. */
  getPublicArchive(
    id: string
  ): Promise<{ item: ArchiveItem; profile: Profile } | null>;

  /** Stores a data: URL image and returns a URL safe to persist. */
  uploadPhoto(ownerId: string, dataUrl: string): Promise<string>;

  /** Increments today's counter and returns the new count. */
  bumpUsage(ownerId: string, kind: AiUsageKind): Promise<number>;
  getUsage(ownerId: string, kind: AiUsageKind): Promise<number>;

  /** Returns the username if this deviceId belongs to a registered ID/Password account. */
  getAccountUsername?(deviceId: string): Promise<string | null>;
  /** Logs in or registers an ID/Password account and migrates any anonymous device logs. */
  loginOrRegister?(
    username: string,
    password: string,
    previousDeviceId?: string | null
  ): Promise<{ accountId: string; username: string; isNewAccount: boolean }>;
}
