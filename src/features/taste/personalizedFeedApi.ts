import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';

import type { MixWeights } from './weights';

export type PersonalizedFeedResponse = {
  results: MediaItem[];
  weights: MixWeights;
  signal_count: number;
  seed_count: number;
  candidate_count?: number;
  error?: string;
};

export type PersonalizedFeedParams = {
  page?: number;
  mediaType?: MediaType;
  language?: string;
  excludeKeys?: Iterable<string>;
};

export async function fetchPersonalizedFeed(
  params: PersonalizedFeedParams = {},
): Promise<PersonalizedFeedResponse | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke<PersonalizedFeedResponse>(
    'personalized-feed',
    {
      body: {
        page: params.page ?? 1,
        media_type: params.mediaType ?? 'movie',
        language: params.language ?? 'es-ES',
        exclude_keys: params.excludeKeys ? [...params.excludeKeys] : [],
      },
    },
  );

  if (error) {
    throw error;
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(data.error);
  }

  if (!data || !Array.isArray(data.results)) {
    return null;
  }

  return data;
}
