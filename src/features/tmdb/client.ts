import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  MediaDetails,
  MediaItem,
  MediaType,
  MediaVideo,
  RegionWatchProviders,
  TmdbAction,
  TmdbListResponse,
  TmdbParams,
  VideosResponse,
  WatchProvidersResponse,
} from '@/src/features/tmdb/types';

type ProxyErrorResponse = {
  error?: string;
};

function isDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
}

function normalizeProxyError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export async function callTmdb<T>(
  action: TmdbAction,
  params: TmdbParams = {},
  devFallback: T,
): Promise<T> {
  try {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.functions.invoke<T | ProxyErrorResponse>('tmdb-proxy', {
      body: {
        action,
        ...params,
      },
    });

    if (error) {
      throw error;
    }

    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error(data.error ?? 'TMDB proxy returned an error');
    }

    return data as T;
  } catch (error) {
    if (isDevRuntime()) {
      console.warn('TMDB proxy call failed; using development fallback.', normalizeProxyError(error).message);
      return devFallback;
    }

    throw normalizeProxyError(error);
  }
}

export type DiscoverFeedParams = Pick<
  TmdbParams,
  | 'media_type'
  | 'region'
  | 'page'
  | 'with_genres'
  | 'with_runtime_lte'
  | 'with_watch_providers'
  | 'with_watch_monetization_types'
  | 'sort_by'
  | 'vote_count_gte'
  | 'primary_release_date_gte'
  | 'primary_release_date_lte'
  | 'first_air_date_gte'
  | 'first_air_date_lte'
  | 'language'
>;

export async function getDiscoverFeed(params: DiscoverFeedParams = {}): Promise<MediaItem[]> {
  const response = await callTmdb<TmdbListResponse<MediaItem>>(
    'discover',
    {
      media_type: params.media_type ?? 'movie',
      ...params,
    },
    {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    },
  );

  return response.results;
}

export async function getDetails(
  mediaType: MediaType,
  id: number | string,
  language?: string,
): Promise<MediaDetails | null> {
  return callTmdb<MediaDetails | null>('details', { media_type: mediaType, id, language }, null);
}

export async function getProviders(
  mediaType: MediaType,
  id: number | string,
  region?: string,
): Promise<RegionWatchProviders | null> {
  const response = await callTmdb<WatchProvidersResponse>(
    'providers',
    { media_type: mediaType, id, region },
    {
      id: Number(id),
      results: {},
    },
  );

  if (!region) {
    return null;
  }

  return response.results[region.toUpperCase()] ?? null;
}

export async function getVideos(
  mediaType: MediaType,
  id: number | string,
  language?: string,
): Promise<MediaVideo[]> {
  const response = await callTmdb<VideosResponse>(
    'videos',
    { media_type: mediaType, id, language },
    {
      id: Number(id),
      results: [],
    },
  );

  return response.results;
}

export async function getSimilar(
  mediaType: MediaType,
  id: number | string,
  page?: number,
  language?: string,
): Promise<MediaItem[]> {
  const response = await callTmdb<TmdbListResponse<MediaItem>>(
    'similar',
    { media_type: mediaType, id, page, language },
    {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    },
  );

  return response.results;
}

export async function getRecommendations(
  mediaType: MediaType,
  id: number | string,
  page?: number,
  language?: string,
): Promise<MediaItem[]> {
  const response = await callTmdb<TmdbListResponse<MediaItem>>(
    'recommendations',
    { media_type: mediaType, id, page, language },
    {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    },
  );

  return response.results;
}

export async function getTrending(
  mediaType: MediaType = 'movie',
  language?: string,
): Promise<MediaItem[]> {
  const response = await callTmdb<TmdbListResponse<MediaItem>>(
    'trending',
    { media_type: mediaType, language },
    {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    },
  );

  return response.results;
}

export async function searchMedia(
  mediaType: MediaType,
  query: string,
  language?: string,
  page?: number,
): Promise<MediaItem[]> {
  const response = await callTmdb<TmdbListResponse<MediaItem>>(
    'search',
    { media_type: mediaType, query, language, page },
    {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    },
  );

  return response.results;
}
