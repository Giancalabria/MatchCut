import { Ionicons } from '@expo/vector-icons';

export type AppIconName =
  | 'explore'
  | 'exploreOutline'
  | 'rooms'
  | 'roomsOutline'
  | 'vault'
  | 'vaultOutline'
  | 'search'
  | 'filters'
  | 'settings'
  | 'back'
  | 'like'
  | 'nope'
  | 'seen'
  | 'chevronForward'
  | 'taste';

const ICON_MAP: Record<AppIconName, keyof typeof Ionicons.glyphMap> = {
  explore: 'compass',
  exploreOutline: 'compass-outline',
  rooms: 'people',
  roomsOutline: 'people-outline',
  vault: 'file-tray-full',
  vaultOutline: 'file-tray-full-outline',
  search: 'search',
  filters: 'options-outline',
  settings: 'settings-outline',
  back: 'chevron-back',
  like: 'bookmark',
  nope: 'close',
  seen: 'eye',
  chevronForward: 'chevron-forward',
  taste: 'sparkles-outline',
};

export function resolveIconName(name: AppIconName): keyof typeof Ionicons.glyphMap {
  return ICON_MAP[name];
}
