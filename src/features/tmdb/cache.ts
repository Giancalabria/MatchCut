import { getDetails, getProviders } from '@/src/features/tmdb/client';
import type {
  Genre,
  MediaDetails,
  MediaType,
  RegionWatchProviders,
  WatchProvider,
} from '@/src/features/tmdb/types';
import {
  getCachedTitleMeta,
  upsertCachedTitleMeta,
  type CachedTitleMeta,
} from '@/src/features/sync/localDb';

const DETAILS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PROVIDERS_TTL_MS = 24 * 60 * 60 * 1000;

type MemoryEntry = {
  meta: CachedTitleMeta;
};

const memoryCache = new Map<string, MemoryEntry>();

function cacheKey(mediaType: MediaType, tmdbId: number, region?: string | null): string {
  const regionKey = region?.trim() ? region.trim().toUpperCase() : '*';
  return `${mediaType}:${tmdbId}:${regionKey}`;
}

function isFresh(fetchedAt: string | null | undefined, ttlMs: number): boolean {
  if (!fetchedAt) {
    return false;
  }
  const ts = Date.parse(fetchedAt);
  if (Number.isNaN(ts)) {
    return false;
  }
  return Date.now() - ts < ttlMs;
}

function titleFromDetails(details: MediaDetails): string {
  return (
    details.title ??
    details.name ??
    details.original_title ??
    details.original_name ??
    `#${details.id}`
  );
}

function runtimeFromDetails(details: MediaDetails): number | null {
  if (typeof details.runtime === 'number') {
    return details.runtime;
  }
  if (Array.isArray(details.episode_run_time) && details.episode_run_time.length > 0) {
    return details.episode_run_time[0] ?? null;
  }
  return null;
}

function detailsFromCache(meta: CachedTitleMeta): MediaDetails {
  return {
    id: meta.tmdb_id,
    media_type: meta.media_type,
    title: meta.title ?? undefined,
    name: meta.title ?? undefined,
    overview: '',
    poster_path: meta.poster_path,
    backdrop_path: null,
    vote_average: meta.vote_average ?? 0,
    vote_count: 0,
    popularity: 0,
    genres: meta.genres,
    homepage: null,
    production_companies: [],
    status: '',
    tagline: null,
    runtime: meta.runtime,
  };
}

async function readMeta(
  mediaType: MediaType,
  tmdbId: number,
  region?: string | null,
): Promise<CachedTitleMeta | null> {
  const key = cacheKey(mediaType, tmdbId, region);
  const memory = memoryCache.get(key);
  if (memory) {
    return memory.meta;
  }
  const disk = await getCachedTitleMeta(mediaType, tmdbId, region);
  if (disk) {
    memoryCache.set(key, { meta: disk });
  }
  return disk;
}

async function writeMeta(
  mediaType: MediaType,
  tmdbId: number,
  region: string | null | undefined,
  patch: Parameters<typeof upsertCachedTitleMeta>[0],
): Promise<CachedTitleMeta> {
  await upsertCachedTitleMeta(patch);
  const meta = (await getCachedTitleMeta(mediaType, tmdbId, region))!;
  memoryCache.set(cacheKey(mediaType, tmdbId, region), { meta });
  return meta;
}

export async function getDetailsCached(
  mediaType: MediaType,
  id: number | string,
  language?: string,
  region?: string | null,
): Promise<MediaDetails | null> {
  const tmdbId = Number(id);
  const cached = await readMeta(mediaType, tmdbId, region);

  if (cached && isFresh(cached.details_fetched_at, DETAILS_TTL_MS) && cached.title) {
    return detailsFromCache(cached);
  }

  const details = await getDetails(mediaType, tmdbId, language);
  if (!details) {
    return cached ? detailsFromCache(cached) : null;
  }

  await writeMeta(mediaType, tmdbId, region, {
    mediaType,
    tmdbId,
    region,
    title: titleFromDetails(details),
    posterPath: details.poster_path,
    voteAverage: details.vote_average,
    runtime: runtimeFromDetails(details),
    genres: details.genres ?? [],
    touchDetails: true,
  });

  return details;
}

export async function getProvidersCached(
  mediaType: MediaType,
  id: number | string,
  region?: string,
): Promise<RegionWatchProviders | null> {
  if (!region) {
    return null;
  }

  const tmdbId = Number(id);
  const cached = await readMeta(mediaType, tmdbId, region);

  if (cached && isFresh(cached.providers_fetched_at, PROVIDERS_TTL_MS)) {
    return { flatrate: cached.providers };
  }

  const providers = await getProviders(mediaType, tmdbId, region);
  const flatrate = providers?.flatrate ?? [];

  await writeMeta(mediaType, tmdbId, region, {
    mediaType,
    tmdbId,
    region,
    providers: flatrate,
    touchProviders: true,
  });

  return providers ?? { flatrate };
}

export type VaultTitleSnapshot = {
  title: string | null;
  posterPath: string | null;
  voteAverage: number | null;
  genres: Genre[];
  providers: WatchProvider[];
};

/** Sync peek of in-memory cache (no SQLite / network). */
export function peekVaultTitleMemory(
  mediaType: MediaType,
  tmdbId: number,
  region?: string | null,
): VaultTitleSnapshot | null {
  const entry = memoryCache.get(cacheKey(mediaType, tmdbId, region));
  if (!entry?.meta) {
    return null;
  }
  const meta = entry.meta;
  if (!meta.title && !meta.poster_path) {
    return null;
  }
  return {
    title: meta.title,
    posterPath: meta.poster_path,
    voteAverage: meta.vote_average,
    genres: meta.genres,
    providers: meta.providers,
  };
}

/** Disk/memory snapshot without network — used to paint vault rows instantly. */
export async function getCachedVaultSnapshot(
  mediaType: MediaType,
  tmdbId: number,
  region?: string | null,
): Promise<VaultTitleSnapshot | null> {
  const cached = await readMeta(mediaType, tmdbId, region);
  if (!cached || (!cached.title && !cached.poster_path)) {
    return null;
  }
  return {
    title: cached.title,
    posterPath: cached.poster_path,
    voteAverage: cached.vote_average,
    genres: cached.genres,
    providers: cached.providers,
  };
}

/** Lightweight vault-row enrich: prefers cache, fetches only what's stale. */
export async function getVaultTitleEnrichment(
  mediaType: MediaType,
  tmdbId: number,
  region?: string | null,
): Promise<VaultTitleSnapshot> {
  const cached = await readMeta(mediaType, tmdbId, region);
  const detailsFresh = cached ? isFresh(cached.details_fetched_at, DETAILS_TTL_MS) : false;
  const providersFresh = !region
    ? true
    : cached
      ? isFresh(cached.providers_fetched_at, PROVIDERS_TTL_MS)
      : false;

  if (detailsFresh && providersFresh && cached) {
    return {
      title: cached.title,
      posterPath: cached.poster_path,
      voteAverage: cached.vote_average,
      genres: cached.genres,
      providers: cached.providers,
    };
  }

  const [details, providers] = await Promise.all([
    detailsFresh && cached
      ? Promise.resolve(detailsFromCache(cached))
      : getDetails(mediaType, tmdbId),
    region && !providersFresh
      ? getProviders(mediaType, tmdbId, region)
      : Promise.resolve(
          cached ? ({ flatrate: cached.providers } satisfies RegionWatchProviders) : null,
        ),
  ]);

  const flatrate = providers?.flatrate ?? cached?.providers ?? [];
  const genres = details?.genres ?? cached?.genres ?? [];
  const title = details
    ? titleFromDetails(details)
    : (cached?.title ?? null);
  const posterPath = details?.poster_path ?? cached?.poster_path ?? null;
  const voteAverage = details?.vote_average ?? cached?.vote_average ?? null;
  const runtime = details ? runtimeFromDetails(details) : (cached?.runtime ?? null);

  await writeMeta(mediaType, tmdbId, region, {
    mediaType,
    tmdbId,
    region,
    title,
    posterPath,
    voteAverage,
    runtime,
    genres,
    providers: flatrate,
    touchDetails: Boolean(details) && !detailsFresh,
    touchProviders: Boolean(region) && !providersFresh,
  });

  return {
    title,
    posterPath,
    voteAverage,
    genres,
    providers: flatrate,
  };
}
