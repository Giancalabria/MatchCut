import type { NopePolicy } from '@/src/features/auth/types';
import type { TitleInteraction } from '@/src/features/interactions/api';

type NopePolicyProfile = {
  nope_policy: NopePolicy;
  nope_cooldown_days: number | null;
};

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isNopeActive(
  interaction: Pick<TitleInteraction, 'action' | 'updated_at'> | null | undefined,
  profile: NopePolicyProfile,
  now: Date = new Date(),
): boolean {
  if (!interaction || interaction.action !== 'nope') {
    return false;
  }

  const updatedAt = new Date(interaction.updated_at);
  if (Number.isNaN(updatedAt.getTime())) {
    return false;
  }

  switch (profile.nope_policy) {
    case 'restore_only':
      return true;
    case 'session':
      return isSameLocalCalendarDay(updatedAt, now);
    case 'cooldown': {
      const cooldownDays = profile.nope_cooldown_days ?? 0;
      const expiresAt = new Date(updatedAt);
      expiresAt.setDate(expiresAt.getDate() + cooldownDays);
      return expiresAt > now;
    }
    default:
      return false;
  }
}
