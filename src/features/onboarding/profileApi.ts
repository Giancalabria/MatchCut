import { supabase } from '@/lib/supabase';
import type { NopePolicy, Profile } from '@/src/features/auth/types';

export type ProfileUpdate = {
  display_name?: string | null;
  region?: string | null;
  platforms?: string[];
  nope_policy?: NopePolicy;
  nope_cooldown_days?: number | null;
  onboarding_completed?: boolean;
  expo_push_token?: string | null;
};

export async function upsertProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}
