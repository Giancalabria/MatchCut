import { supabase } from '@/lib/supabase';
import type { MediaType } from '@/src/features/tmdb/types';

export type InteractionAction = 'like' | 'nope' | 'seen';

export type TitleInteraction = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  action: InteractionAction;
  rating: number | null;
  created_at: string;
  updated_at: string;
};

export type UpsertInteractionInput = {
  tmdb_id: number;
  media_type: MediaType;
  action: InteractionAction;
  rating?: number | null;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('A signed-in user is required');
  }

  return data.user.id;
}

export async function upsertInteraction(input: UpsertInteractionInput): Promise<TitleInteraction> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('title_interactions')
    .upsert(
      {
        user_id: userId,
        tmdb_id: input.tmdb_id,
        media_type: input.media_type,
        action: input.action,
        rating: input.rating ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tmdb_id,media_type' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as TitleInteraction;
}

export async function listByAction(action: InteractionAction): Promise<TitleInteraction[]> {
  const { data, error } = await supabase
    .from('title_interactions')
    .select('*')
    .eq('action', action)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TitleInteraction[];
}

export async function setRating(
  tmdbId: number,
  mediaType: MediaType,
  rating: number | null,
): Promise<TitleInteraction> {
  if (rating !== null && (rating < 1 || rating > 10)) {
    throw new Error('rating must be between 1 and 10');
  }

  return upsertInteraction({
    tmdb_id: tmdbId,
    media_type: mediaType,
    action: 'seen',
    rating,
  });
}

export async function restoreNope(tmdbId: number, mediaType: MediaType): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('title_interactions')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .eq('action', 'nope');

  if (error) {
    throw error;
  }
}

export async function countUnrated(): Promise<number> {
  const { count, error } = await supabase
    .from('title_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'seen')
    .is('rating', null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}
