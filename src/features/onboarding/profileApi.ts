import { supabase } from '@/lib/supabase';
import type { NopePolicy, Profile } from '@/src/features/auth/types';

export type ProfileUpdate = {
  display_name?: string | null;
  region?: string | null;
  platforms?: string[];
  nope_policy?: NopePolicy;
  nope_cooldown_days?: number | null;
  onboarding_completed?: boolean;
  liked_genre_ids?: number[];
  disliked_genre_ids?: number[];
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

  const row = data as Profile;
  return {
    ...row,
    liked_genre_ids: Array.isArray(row.liked_genre_ids) ? row.liked_genre_ids : [],
    disliked_genre_ids: Array.isArray(row.disliked_genre_ids) ? row.disliked_genre_ids : [],
  };
}
