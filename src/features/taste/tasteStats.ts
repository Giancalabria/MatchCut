import type { TitleInteraction } from '@/src/features/interactions/api';
import { MOVIE_GENRES, TV_GENRES } from '@/src/features/filters/constants';
import { SIGNAL_SATURATION } from '@/src/features/taste/weights';

const GENRE_NAME_BY_ID = new Map<number, string>(
  [...MOVIE_GENRES, ...TV_GENRES].map((genre) => [genre.id, genre.nameKey]),
);

/** Minimum rated titles before showing a firm taste signature. */
export const SIGNATURE_MIN_RATINGS = 10;

/** Pending queue size that still feels "caught up". */
export const PENDING_TARGET = 5;

export type TasteStats = {
  ratedCount: number;
  pendingCount: number;
  averageRating: number | null;
  ratingHistogram: number[];
  ratedThisMonth: number;
  highScoresThisMonth: number;
  /** 0–1 mix of signal density and pending clearance. */
  tuningProgress: number;
  tuningReady: boolean;
  signatureGenreIds: number[];
  signatureGenreKeys: string[];
};

function isRatedSeen(interaction: TitleInteraction): boolean {
  return interaction.action === 'seen' && interaction.rating != null;
}

function isUnratedSeen(interaction: TitleInteraction): boolean {
  return interaction.action === 'seen' && interaction.rating == null;
}

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Pure stats from interactions + optional genre ids per title (from local cache / profile).
 * `genreIdsByKey` keys are `${media_type}:${tmdb_id}`.
 */
export function buildTasteStats(
  interactions: TitleInteraction[],
  genreIdsByKey: Record<string, number[]> = {},
  fallbackLikedGenreIds: number[] = [],
): TasteStats {
  const rated = interactions.filter(isRatedSeen);
  const pending = interactions.filter(isUnratedSeen);
  const monthStart = startOfMonthIso();

  const ratingHistogram = Array.from({ length: 10 }, () => 0);
  let ratingSum = 0;
  let ratedThisMonth = 0;
  let highScoresThisMonth = 0;

  for (const item of rated) {
    const rating = item.rating!;
    ratingHistogram[rating - 1] += 1;
    ratingSum += rating;
    if (item.updated_at >= monthStart) {
      ratedThisMonth += 1;
      if (rating >= 9) {
        highScoresThisMonth += 1;
      }
    }
  }

  const genreWeights = new Map<number, number>();
  for (const item of rated) {
    const key = `${item.media_type}:${item.tmdb_id}`;
    const genres = genreIdsByKey[key] ?? [];
    const weight = Math.max(1, item.rating! - 4);
    for (const genreId of genres) {
      genreWeights.set(genreId, (genreWeights.get(genreId) ?? 0) + weight);
    }
  }

  let signatureGenreIds = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 3);

  if (signatureGenreIds.length === 0 && fallbackLikedGenreIds.length > 0) {
    signatureGenreIds = fallbackLikedGenreIds.slice(0, 3);
  }

  const signatureGenreKeys = signatureGenreIds
    .map((id) => GENRE_NAME_BY_ID.get(id))
    .filter((key): key is string => Boolean(key));

  const ratedCount = rated.length;
  const pendingCount = pending.length;
  const signalProgress = Math.min(1, ratedCount / SIGNAL_SATURATION);
  const pendingProgress =
    pendingCount === 0 ? 1 : Math.max(0, 1 - pendingCount / Math.max(PENDING_TARGET * 4, pendingCount));
  const tuningProgress = Math.min(1, signalProgress * 0.75 + pendingProgress * 0.25);
  const tuningReady = ratedCount >= SIGNAL_SATURATION && pendingCount <= PENDING_TARGET;

  return {
    ratedCount,
    pendingCount,
    averageRating: ratedCount > 0 ? ratingSum / ratedCount : null,
    ratingHistogram,
    ratedThisMonth,
    highScoresThisMonth,
    tuningProgress,
    tuningReady,
    signatureGenreIds,
    signatureGenreKeys,
  };
}

export function mediaInteractionKey(mediaType: string, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

export function genreNameKeyForId(genreId: number): string | undefined {
  return GENRE_NAME_BY_ID.get(genreId);
}
