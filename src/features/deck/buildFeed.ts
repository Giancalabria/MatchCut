import type { Profile } from '@/src/features/auth/types';
import { fetchWithMood } from '@/src/features/filters/fetchWithMood';
import { MOVIE_GENRES } from '@/src/features/filters/constants';
import type { MoodFilters } from '@/src/features/filters/types';
import { isMoodActive } from '@/src/features/filters/types';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { isNopeActive } from '@/src/features/interactions/nopePolicy';
import { STREAMING_PLATFORMS } from '@/src/features/onboarding/constants';
import { fetchPersonalizedFeed } from '@/src/features/taste/personalizedFeedApi';
import { mixWeightsFromSignals } from '@/src/features/taste/weights';
import {
  getDiscoverFeed,
  getDetails,
  getRecommendations,
  getSimilar,
  getTrending,
} from '@/src/features/tmdb/client';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';

export type BuildFeedOptions = {
  mediaType?: MediaType;
  language?: string;
  now?: Date;
  mood?: MoodFilters;
  /** Logical feed cursor (1-based). Keeps advancing forever for infinite scroll. */
  page?: number;
  /** Already-shown keys this session (`movie:123`). */
  excludeKeys?: Iterable<string>;
  /** When false, interactions only affect ranking (rooms). Default true. */
  excludeInteracted?: boolean;
};

const PLATFORM_PROVIDER_IDS = new Map(
  STREAMING_PLATFORMS.map((platform) => [platform.id, platform.tmdbProviderId]),
);

const DECADES = [
  { gte: '1970-01-01', lte: '1979-12-31' },
  { gte: '1980-01-01', lte: '1989-12-31' },
  { gte: '1990-01-01', lte: '1999-12-31' },
  { gte: '2000-01-01', lte: '2009-12-31' },
  { gte: '2010-01-01', lte: '2019-12-31' },
  { gte: '2020-01-01', lte: '2026-12-31' },
] as const;

const SORTS = ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc', 'revenue.desc'] as const;

const DIVERSITY_GENRES = MOVIE_GENRES.filter((genre) => genre.id !== 99).map((genre) => genre.id);

function mediaKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

function itemMediaType(item: MediaItem, fallback: MediaType): MediaType {
  return item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : fallback;
}

function providerIdsForProfile(profile: Profile): number[] {
  return profile.platforms
    .map((platformId) => PLATFORM_PROVIDER_IDS.get(platformId))
    .filter((providerId): providerId is number => typeof providerId === 'number');
}

function yearOf(item: MediaItem): number | null {
  const raw = item.release_date ?? item.first_air_date;
  if (!raw || raw.length < 4) {
    return null;
  }
  const year = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function recencyFactor(updatedAt: string, now = Date.now()): number {
  const ageMs = Math.max(0, now - Date.parse(updatedAt));
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0.35, Math.exp(-ageDays / 120));
}

function seedStrength(interaction: TitleInteraction, now = Date.now()): number {
  const recency = recencyFactor(interaction.updated_at, now);
  if (interaction.action === 'like') {
    return 0.9 * recency;
  }
  if (interaction.action === 'seen' && (interaction.rating ?? 0) >= 8) {
    return ((interaction.rating ?? 8) / 10) * recency;
  }
  if (interaction.action === 'seen' && interaction.rating == null) {
    return 0.35 * recency;
  }
  return 0;
}

function pickSeeds(interactions: TitleInteraction[], mediaType: MediaType, limit = 5): TitleInteraction[] {
  const now = Date.now();
  const scoped = interactions.filter((row) => row.media_type === mediaType);
  const strong = scoped
    .filter((row) => row.action === 'like' || (row.action === 'seen' && (row.rating ?? 0) >= 8))
    .map((row) => ({ row, strength: seedStrength(row, now) }))
    .filter((entry) => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength);

  if (strong.length >= 3) {
    return strong.slice(0, limit).map((entry) => entry.row);
  }

  const weak = scoped
    .filter((row) => row.action === 'seen' && row.rating == null)
    .map((row) => ({ row, strength: seedStrength(row, now) }))
    .filter((entry) => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength);

  return [...strong, ...weak]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit)
    .map((entry) => entry.row);
}

async function getRatedGenreIds(
  interactions: TitleInteraction[],
  language: string,
  predicate: (rating: number) => boolean,
  limit = 8,
): Promise<Set<number>> {
  const rated = interactions
    .filter((interaction) => interaction.action === 'seen' && predicate(interaction.rating ?? 0))
    .slice(0, limit);

  const details = await Promise.all(
    rated.map((interaction) => getDetails(interaction.media_type, interaction.tmdb_id, language)),
  );

  return new Set(details.flatMap((detail) => detail?.genres.map((genre) => genre.id) ?? []));
}

type RatedGenreCache = {
  signature: string;
  language: string;
  liked: Set<number>;
  disliked: Set<number>;
};

let ratedGenreCache: RatedGenreCache | null = null;

function ratedInteractionsSignature(interactions: TitleInteraction[]): string {
  return interactions
    .filter((item) => item.action === 'seen' && item.rating != null)
    .map((item) => `${item.media_type}:${item.tmdb_id}:${item.rating}`)
    .sort()
    .join('|');
}

/** Cache liked/disliked genre sets across buildFeed pages in the same session. */
async function getCachedRatedGenreSets(
  interactions: TitleInteraction[],
  language: string,
): Promise<{ liked: Set<number>; disliked: Set<number> }> {
  const signature = ratedInteractionsSignature(interactions);
  if (
    ratedGenreCache &&
    ratedGenreCache.signature === signature &&
    ratedGenreCache.language === language
  ) {
    return { liked: ratedGenreCache.liked, disliked: ratedGenreCache.disliked };
  }

  const [liked, disliked] = await Promise.all([
    getRatedGenreIds(interactions, language, (rating) => rating >= 8),
    getRatedGenreIds(interactions, language, (rating) => rating > 0 && rating <= 4),
  ]);

  ratedGenreCache = { signature, language, liked, disliked };
  return { liked, disliked };
}

function scoreItemLocal(
  item: MediaItem,
  likedGenreIds: Set<number>,
  dislikedGenreIds: Set<number>,
  onPlatformKeys: Set<string>,
  mediaType: MediaType,
  weights: ReturnType<typeof mixWeightsFromSignals>,
  seedBoostKeys: Set<string>,
): number {
  const genres = item.genre_ids ?? [];
  const likedHit = genres.some((genreId) => likedGenreIds.has(genreId)) ? 1 : 0;
  const dislikedHit = genres.some((genreId) => dislikedGenreIds.has(genreId)) ? 1 : 0;
  const heuristic = Math.max(0, Math.min(1, 0.55 * likedHit + 0.2 * (1 - dislikedHit) + 0.25 * Math.min(1, Math.log10(Math.max(item.popularity, 1)) / 3)));
  const embeddingProxy = seedBoostKeys.has(mediaKey(itemMediaType(item, mediaType), item.id)) ? 0.85 : 0.45;
  const platform = onPlatformKeys.has(mediaKey(itemMediaType(item, mediaType), item.id)) ? 1 : 0;
  const jitter = Math.random() * 0.04;
  return weights.alpha * heuristic + weights.beta * embeddingProxy + weights.gamma * platform + jitter;
}

/** Spread titles so consecutive cards tend to differ in decade / primary genre. */
function diversifyOrder(items: MediaItem[]): MediaItem[] {
  if (items.length <= 2) {
    return items;
  }

  const remaining = [...items];
  const ordered: MediaItem[] = [];
  let lastYearBucket: number | null = null;
  let lastGenre: number | null = null;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const year = yearOf(candidate);
      const yearBucket = year !== null ? Math.floor(year / 10) : null;
      const genre = candidate.genre_ids?.[0] ?? null;
      let local = Math.random() * 10;
      if (yearBucket !== null && yearBucket === lastYearBucket) {
        local -= 25;
      }
      if (genre !== null && genre === lastGenre) {
        local -= 20;
      }
      if (local > bestScore) {
        bestScore = local;
        bestIndex = i;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    ordered.push(picked);
    const year = yearOf(picked);
    lastYearBucket = year !== null ? Math.floor(year / 10) : null;
    lastGenre = picked.genre_ids?.[0] ?? null;
  }

  return ordered;
}

async function fetchDiversifiedBatch(
  profile: Profile,
  mediaType: MediaType,
  language: string,
  page: number,
): Promise<{ pool: MediaItem[]; onPlatformKeys: Set<string> }> {
  const wantedProviders = providerIdsForProfile(profile);
  const withWatchProviders =
    profile.region && wantedProviders.length > 0 ? wantedProviders.join('|') : undefined;

  const decade = DECADES[(page - 1) % DECADES.length];
  const genreId = DIVERSITY_GENRES[Math.floor((page - 1) / DECADES.length) % DIVERSITY_GENRES.length];
  const sortBy = SORTS[(page - 1) % SORTS.length];
  const tmdbPageA = ((page * 11) % 25) + 1;
  const tmdbPageB = ((page * 7 + 3) % 20) + 1;
  const tmdbPageC = ((page * 5 + 1) % 15) + 1;

  const dateField =
    mediaType === 'tv'
      ? {
          first_air_date_gte: decade.gte,
          first_air_date_lte: decade.lte,
        }
      : {
          primary_release_date_gte: decade.gte,
          primary_release_date_lte: decade.lte,
        };

  const [eraGenre, broad, platformPool, trending] = await Promise.all([
    getDiscoverFeed({
      media_type: mediaType,
      region: profile.region ?? undefined,
      language,
      page: tmdbPageA,
      with_genres: String(genreId),
      sort_by: sortBy,
      vote_count_gte: 150,
      ...dateField,
    }),
    getDiscoverFeed({
      media_type: mediaType,
      region: profile.region ?? undefined,
      language,
      page: tmdbPageB,
      sort_by: 'popularity.desc',
      vote_count_gte: 200,
    }),
    withWatchProviders
      ? getDiscoverFeed({
          media_type: mediaType,
          region: profile.region ?? undefined,
          language,
          page: tmdbPageC,
          with_watch_providers: withWatchProviders,
          with_watch_monetization_types: 'flatrate',
          sort_by: 'popularity.desc',
        })
      : Promise.resolve([]),
    page === 1 ? getTrending(mediaType, language) : Promise.resolve([]),
  ]);

  const onPlatformKeys = new Set(
    platformPool.map((item) => mediaKey(itemMediaType(item, mediaType), item.id)),
  );

  return {
    pool: [...platformPool, ...eraGenre, ...broad, ...trending],
    onPlatformKeys,
  };
}

async function fetchSeedSimilarPool(
  seeds: TitleInteraction[],
  language: string,
): Promise<{ pool: MediaItem[]; seedBoostKeys: Set<string> }> {
  const seedBoostKeys = new Set<string>();
  const batches = await Promise.all(
    seeds.slice(0, 4).flatMap((seed, index) => {
      const tasks = [getSimilar(seed.media_type, seed.tmdb_id, 1, language)];
      if (index < 2) {
        tasks.push(getRecommendations(seed.media_type, seed.tmdb_id, 1, language));
      }
      return tasks;
    }),
  );

  const pool: MediaItem[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      const mediaType = itemMediaType(item, 'movie');
      const key = mediaKey(mediaType, item.id);
      seedBoostKeys.add(key);
      pool.push({ ...item, media_type: mediaType });
    }
  }

  return { pool, seedBoostKeys };
}

async function buildLocalPersonalizedFeed(
  profile: Profile,
  interactions: TitleInteraction[],
  options: BuildFeedOptions,
  blockedKeys: Set<string>,
): Promise<MediaItem[]> {
  const mediaType = options.mediaType ?? 'movie';
  const language = options.language ?? 'es-ES';
  const page = Math.max(1, options.page ?? 1);
  const weights = mixWeightsFromSignals(interactions.length);
  const seeds = pickSeeds(interactions, mediaType);

  const [diversified, similarPool, ratedGenres] = await Promise.all([
    fetchDiversifiedBatch(profile, mediaType, language, page),
    fetchSeedSimilarPool(seeds, language),
    getCachedRatedGenreSets(interactions, language),
  ]);

  const likedGenreIds = new Set([...(profile.liked_genre_ids ?? []), ...ratedGenres.liked]);
  const dislikedGenreIds = new Set([
    ...(profile.disliked_genre_ids ?? []),
    ...ratedGenres.disliked,
  ]);

  const deduped = new Map<string, MediaItem>();
  for (const item of [...similarPool.pool, ...diversified.pool]) {
    const resolvedMediaType = itemMediaType(item, mediaType);
    const key = mediaKey(resolvedMediaType, item.id);
    if (!blockedKeys.has(key) && !deduped.has(key)) {
      deduped.set(key, { ...item, media_type: resolvedMediaType });
    }
  }

  const ranked = [...deduped.values()].sort(
    (a, b) =>
      scoreItemLocal(
        b,
        likedGenreIds,
        dislikedGenreIds,
        diversified.onPlatformKeys,
        mediaType,
        weights,
        similarPool.seedBoostKeys,
      ) -
      scoreItemLocal(
        a,
        likedGenreIds,
        dislikedGenreIds,
        diversified.onPlatformKeys,
        mediaType,
        weights,
        similarPool.seedBoostKeys,
      ),
  );

  return diversifyOrder(shuffle(ranked));
}

export async function buildFeed(
  profile: Profile,
  interactions: TitleInteraction[],
  options: BuildFeedOptions = {},
): Promise<MediaItem[]> {
  const mediaType = options.mediaType ?? 'movie';
  const language = options.language ?? 'es-ES';
  const now = options.now ?? new Date();
  const page = Math.max(1, options.page ?? 1);
  const excludeInteracted = options.excludeInteracted ?? true;
  const blockedKeys = new Set<string>(options.excludeKeys ? [...options.excludeKeys] : []);

  if (excludeInteracted) {
    for (const interaction of interactions) {
      const key = mediaKey(interaction.media_type, interaction.tmdb_id);
      if (interaction.action === 'like' || interaction.action === 'seen') {
        blockedKeys.add(key);
        continue;
      }

      if (isNopeActive(interaction, profile, now)) {
        blockedKeys.add(key);
      }
    }
  }

  const mood = options.mood;
  const moodActive = mood ? isMoodActive(mood) : false;

  if (moodActive && mood) {
    const moodCandidates = await fetchWithMood(profile, mood, {
      language,
      page: ((page * 9) % 20) + 1,
    });
    const deduped = new Map<string, MediaItem>();
    for (const item of moodCandidates) {
      const resolvedMediaType = itemMediaType(item, mediaType);
      const key = mediaKey(resolvedMediaType, item.id);
      if (!blockedKeys.has(key) && !deduped.has(key)) {
        deduped.set(key, { ...item, media_type: resolvedMediaType });
      }
    }
    return [...deduped.values()];
  }

  try {
    const personalized = await fetchPersonalizedFeed({
      page,
      mediaType,
      language,
      excludeKeys: blockedKeys,
    });
    if (personalized && personalized.results.length > 0) {
      return personalized.results.map((item) => ({
        ...item,
        media_type: itemMediaType(item, mediaType),
      }));
    }
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('personalized-feed failed; using local fallback', error);
    }
  }

  return buildLocalPersonalizedFeed(profile, interactions, options, blockedKeys);
}
