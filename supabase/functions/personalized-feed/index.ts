// @ts-expect-error Deno remote imports are resolved by the Supabase Edge Runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno npm imports are resolved by the Supabase Edge Runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { ensureEmbeddings, type TitleRef } from '../_shared/embeddings.ts';
import {
  castIdsFromDetails,
  directorIdsFromDetails,
  fetchDetails,
  fetchDiscover,
  fetchRecommendations,
  fetchSimilar,
  fetchTrending,
  keywordIdsFromDetails,
  type MediaType,
  type TmdbListItem,
} from '../_shared/tmdb.ts';
import {
  addWeight,
  combineScore,
  cosineSimilarity,
  decadeBucket,
  heuristicScore,
  interactionSignalWeight,
  mixWeightsFromSignals,
  seedStrength,
  type InteractionRow,
  type TasteProfile,
  weightedAverageVectors,
  yearFromDate,
} from '../_shared/tasteMath.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type ProfileRow = {
  id: string;
  region: string | null;
  platforms: string[] | null;
  liked_genre_ids: number[] | null;
  disliked_genre_ids: number[] | null;
  nope_policy: 'restore_only' | 'session' | 'cooldown';
  nope_cooldown_days: number | null;
};

const PLATFORM_PROVIDER_IDS: Record<string, number> = {
  netflix: 8,
  prime: 9,
  disney: 337,
  max: 1899,
  apple: 350,
  paramount: 531,
  hulu: 15,
  peacock: 386,
  crunchyroll: 283,
  mubi: 11,
};

const DECADES = [
  { gte: '1970-01-01', lte: '1979-12-31' },
  { gte: '1980-01-01', lte: '1989-12-31' },
  { gte: '1990-01-01', lte: '1999-12-31' },
  { gte: '2000-01-01', lte: '2009-12-31' },
  { gte: '2010-01-01', lte: '2019-12-31' },
  { gte: '2020-01-01', lte: '2026-12-31' },
] as const;

const DIVERSITY_GENRES = [28, 12, 16, 35, 80, 18, 10751, 14, 27, 9648, 10749, 878, 53];
const SORTS = ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc', 'revenue.desc'] as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function mediaKey(mediaType: MediaType, id: number): string {
  return `${mediaType}:${id}`;
}

function itemMediaType(item: TmdbListItem, fallback: MediaType): MediaType {
  return item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : fallback;
}

function normalizeItem(item: TmdbListItem, fallback: MediaType): TmdbListItem & { media_type: MediaType } {
  return {
    ...item,
    media_type: itemMediaType(item, fallback),
    vote_average: item.vote_average ?? 0,
    vote_count: item.vote_count ?? 0,
    popularity: item.popularity ?? 0,
    overview: item.overview ?? '',
  };
}

function isNopeActive(row: InteractionRow, profile: ProfileRow, now: Date): boolean {
  if (row.action !== 'nope') {
    return false;
  }
  if (profile.nope_policy === 'restore_only') {
    return true;
  }
  if (profile.nope_policy === 'session') {
    const updated = new Date(row.updated_at);
    return (
      updated.getFullYear() === now.getFullYear() &&
      updated.getMonth() === now.getMonth() &&
      updated.getDate() === now.getDate()
    );
  }
  const days = profile.nope_cooldown_days ?? 90;
  const expires = Date.parse(row.updated_at) + days * 24 * 60 * 60 * 1000;
  return expires > now.getTime();
}

function providerIds(platforms: string[] | null | undefined): number[] {
  return (platforms ?? [])
    .map((id) => PLATFORM_PROVIDER_IDS[id])
    .filter((id): id is number => typeof id === 'number');
}

async function buildTasteFromInteractions(
  interactions: InteractionRow[],
  profile: ProfileRow,
  language: string,
  mediaType: MediaType,
): Promise<TasteProfile> {
  const genreWeights: Record<string, number> = {};
  const decadeWeights: Record<string, number> = {};
  const keywordWeights: Record<string, number> = {};
  const castWeights: Record<string, number> = {};
  const now = Date.now();

  for (const genreId of profile.liked_genre_ids ?? []) {
    addWeight(genreWeights, String(genreId), 0.45);
  }
  for (const genreId of profile.disliked_genre_ids ?? []) {
    addWeight(genreWeights, String(genreId), -0.45);
  }

  const enrichTargets = interactions
    .filter((row) => Math.abs(interactionSignalWeight(row, now)) >= 0.3)
    .filter((row) => row.media_type === mediaType)
    .slice(0, 16);

  for (const row of enrichTargets) {
    const weight = interactionSignalWeight(row, now);
    try {
      const details = await fetchDetails(row.media_type, row.tmdb_id, language);
      const genres = details.genres?.map((g) => g.id) ?? details.genre_ids ?? [];
      for (const genreId of genres) {
        addWeight(genreWeights, String(genreId), weight);
      }
      const year = yearFromDate(details.release_date ?? details.first_air_date);
      const decade = decadeBucket(year);
      if (decade) {
        addWeight(decadeWeights, decade, weight);
      }
      for (const keywordId of keywordIdsFromDetails(details).slice(0, 10)) {
        addWeight(keywordWeights, String(keywordId), weight * 0.6);
      }
      for (const castId of castIdsFromDetails(details).slice(0, 5)) {
        addWeight(castWeights, String(castId), weight * 0.5);
      }
      for (const directorId of directorIdsFromDetails(details)) {
        addWeight(castWeights, String(directorId), weight * 0.8);
      }
    } catch (error) {
      console.warn('taste enrich failed', row.tmdb_id, error);
    }
  }

  return {
    genreWeights,
    decadeWeights,
    keywordWeights,
    castWeights,
    signalCount: interactions.length,
    updatedAt: new Date().toISOString(),
  };
}

function pickSeeds(interactions: InteractionRow[], mediaType: MediaType, limit = 6): InteractionRow[] {
  const now = Date.now();
  const strong = interactions
    .filter((row) => row.media_type === mediaType)
    .filter((row) => row.action === 'like' || (row.action === 'seen' && (row.rating ?? 0) >= 8))
    .map((row) => ({ row, strength: seedStrength(row, now) }))
    .filter((entry) => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength);

  if (strong.length >= 3) {
    return strong.slice(0, limit).map((entry) => entry.row);
  }

  const weak = interactions
    .filter((row) => row.media_type === mediaType)
    .filter((row) => row.action === 'seen' && row.rating == null)
    .map((row) => ({ row, strength: seedStrength(row, now) }))
    .filter((entry) => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength);

  const merged = [...strong, ...weak]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit)
    .map((entry) => entry.row);

  return merged;
}

function diversifyOrder(items: Array<TmdbListItem & { media_type: MediaType }>): Array<TmdbListItem & { media_type: MediaType }> {
  if (items.length <= 2) {
    return items;
  }
  const remaining = [...items];
  const ordered: Array<TmdbListItem & { media_type: MediaType }> = [];
  let lastYearBucket: number | null = null;
  let lastGenre: number | null = null;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const year = yearFromDate(candidate.release_date ?? candidate.first_air_date);
      const yearBucket = year != null ? Math.floor(year / 10) : null;
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
    const year = yearFromDate(picked.release_date ?? picked.first_air_date);
    lastYearBucket = year != null ? Math.floor(year / 10) : null;
    lastGenre = picked.genre_ids?.[0] ?? null;
  }
  return ordered;
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return jsonResponse({ error: 'Supabase credentials missing' }, 500);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization bearer token' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const mediaType: MediaType = body.media_type === 'tv' ? 'tv' : 'movie';
  const language = typeof body.language === 'string' ? body.language : 'es-ES';
  const page = Math.max(1, typeof body.page === 'number' ? Math.trunc(body.page) : 1);
  const excludeKeys = new Set<string>(
    Array.isArray(body.exclude_keys)
      ? body.exclude_keys.filter((key): key is string => typeof key === 'string')
      : [],
  );

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRole);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const [{ data: profile, error: profileError }, { data: interactions, error: interactionsError }] =
    await Promise.all([
      admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      admin
        .from('title_interactions')
        .select('tmdb_id, media_type, action, rating, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(400),
    ]);

  if (profileError || !profile) {
    return jsonResponse({ error: profileError?.message ?? 'Profile not found' }, 400);
  }
  if (interactionsError) {
    return jsonResponse({ error: interactionsError.message }, 400);
  }

  const profileRow = profile as ProfileRow;
  const interactionRows = (interactions ?? []) as InteractionRow[];
  const now = new Date();

  for (const row of interactionRows) {
    const key = mediaKey(row.media_type, row.tmdb_id);
    if (row.action === 'like' || row.action === 'seen') {
      excludeKeys.add(key);
      continue;
    }
    if (isNopeActive(row, profileRow, now)) {
      excludeKeys.add(key);
    }
  }

  const weights = mixWeightsFromSignals(interactionRows.length);
  const taste = await buildTasteFromInteractions(interactionRows, profileRow, language, mediaType);
  const seeds = pickSeeds(interactionRows, mediaType, 6);

  void admin
    .from('profiles')
    .update({ taste_profile: taste, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  const providers = providerIds(profileRow.platforms);
  const withWatchProviders =
    profileRow.region && providers.length > 0 ? providers.join('|') : undefined;
  const decade = DECADES[(page - 1) % DECADES.length];
  const genreId = DIVERSITY_GENRES[Math.floor((page - 1) / DECADES.length) % DIVERSITY_GENRES.length];
  const sortBy = SORTS[(page - 1) % SORTS.length];
  const tmdbPageA = ((page * 11) % 25) + 1;
  const tmdbPageB = ((page * 7 + 3) % 20) + 1;
  const tmdbPageC = ((page * 5 + 1) % 15) + 1;

  const dateField =
    mediaType === 'tv'
      ? { 'first_air_date.gte': decade.gte, 'first_air_date.lte': decade.lte }
      : { 'primary_release_date.gte': decade.gte, 'primary_release_date.lte': decade.lte };

  const seedFetches = seeds.slice(0, 4).flatMap((seed, index) => {
    const tasks = [fetchSimilar(seed.media_type, seed.tmdb_id, language, 1)];
    if (index < 2) {
      tasks.push(fetchRecommendations(seed.media_type, seed.tmdb_id, language, 1));
    }
    return tasks;
  });

  const [similarBatches, eraGenre, broad, platformPool, trending] = await Promise.all([
    Promise.all(seedFetches),
    fetchDiscover(mediaType, language, {
      page: String(tmdbPageA),
      with_genres: String(genreId),
      sort_by: sortBy,
      'vote_count.gte': '150',
      ...(profileRow.region ? { region: profileRow.region, watch_region: profileRow.region } : {}),
      ...dateField,
    }),
    fetchDiscover(mediaType, language, {
      page: String(tmdbPageB),
      sort_by: 'popularity.desc',
      'vote_count.gte': '200',
      ...(profileRow.region ? { region: profileRow.region, watch_region: profileRow.region } : {}),
    }),
    withWatchProviders
      ? fetchDiscover(mediaType, language, {
          page: String(tmdbPageC),
          with_watch_providers: withWatchProviders,
          with_watch_monetization_types: 'flatrate',
          sort_by: 'popularity.desc',
          ...(profileRow.region ? { region: profileRow.region, watch_region: profileRow.region } : {}),
        })
      : Promise.resolve([] as TmdbListItem[]),
    page === 1 ? fetchTrending(mediaType, language) : Promise.resolve([] as TmdbListItem[]),
  ]);

  const onPlatformKeys = new Set(
    platformPool.map((item) => mediaKey(itemMediaType(item, mediaType), item.id)),
  );

  const pool: Array<TmdbListItem & { media_type: MediaType }> = [];
  const pushPool = (items: TmdbListItem[]) => {
    for (const item of items) {
      const normalized = normalizeItem(item, mediaType);
      const key = mediaKey(normalized.media_type, normalized.id);
      if (!excludeKeys.has(key)) {
        pool.push(normalized);
      }
    }
  };

  for (const batch of similarBatches) {
    pushPool(batch);
  }
  pushPool(platformPool);
  pushPool(eraGenre);
  pushPool(broad);
  pushPool(trending);

  const deduped = new Map<string, TmdbListItem & { media_type: MediaType }>();
  for (const item of pool) {
    const key = mediaKey(item.media_type, item.id);
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  const candidates = [...deduped.values()].slice(0, 80);
  const refs: TitleRef[] = [
    ...seeds.map((seed) => ({ media_type: seed.media_type, tmdb_id: seed.tmdb_id })),
    ...candidates.map((item) => ({ media_type: item.media_type, tmdb_id: item.id })),
  ];

  const embeddings = await ensureEmbeddings(admin, refs, language);
  const nowMs = Date.now();
  const userVector = weightedAverageVectors(
    seeds
      .map((seed) => ({
        vector: embeddings.get(mediaKey(seed.media_type, seed.tmdb_id)) ?? [],
        weight: seedStrength(seed, nowMs),
      }))
      .filter((entry) => entry.vector.length > 0),
  );

  const ranked = candidates
    .map((item) => {
      const year = yearFromDate(item.release_date ?? item.first_air_date);
      const h = heuristicScore(item.genre_ids ?? [], year, taste, item.popularity ?? 0);
      const vector = embeddings.get(mediaKey(item.media_type, item.id));
      const emb =
        userVector && vector
          ? Math.max(0, (cosineSimilarity(userVector, vector) + 1) / 2)
          : 0.5;
      const onPlatform = onPlatformKeys.has(mediaKey(item.media_type, item.id));
      return {
        item,
        score: combineScore(weights, h, emb, onPlatform),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  const diversified = diversifyOrder(ranked).slice(0, 24);

  return jsonResponse({
    results: diversified,
    weights,
    signal_count: interactionRows.length,
    seed_count: seeds.length,
    candidate_count: candidates.length,
  });
});
