import type { TitleInteraction } from '@/src/features/interactions/api';
import { getCachedVaultSnapshot } from '@/src/features/tmdb/cache';
import { mediaInteractionKey } from '@/src/features/taste/tasteStats';

/** Best-effort genre ids from local vault cache (no network). */
export async function loadGenreIdsFromCache(
  interactions: TitleInteraction[],
  region?: string | null,
): Promise<Record<string, number[]>> {
  const rated = interactions.filter((item) => item.action === 'seen' && item.rating != null);
  const entries = await Promise.all(
    rated.map(async (item) => {
      const snapshot = await getCachedVaultSnapshot(item.media_type, item.tmdb_id, region);
      const ids = snapshot?.genres?.map((genre) => genre.id) ?? [];
      return [mediaInteractionKey(item.media_type, item.tmdb_id), ids] as const;
    }),
  );

  const result: Record<string, number[]> = {};
  for (const [key, ids] of entries) {
    if (ids.length > 0) {
      result[key] = ids;
    }
  }
  return result;
}
