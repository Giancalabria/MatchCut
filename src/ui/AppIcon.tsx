import { Ionicons } from '@expo/vector-icons';

import { resolveIconName, type AppIconName } from '@/src/ui/icons';

export function AppIcon({
  name,
  size = 22,
  color,
}: {
  name: AppIconName;
  size?: number;
  color: string;
}) {
  return <Ionicons name={resolveIconName(name)} size={size} color={color} />;
}
