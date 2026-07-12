import type { Profile } from '@/src/features/auth/types';
import { fetchWithMood } from '@/src/features/filters/fetchWithMood';
import type { MoodFilters } from '@/src/features/filters/types';
import { isMoodActive } from '@/src/features/filters/types';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { isNopeActive } from '@/src/features/interactions/nopePolicy';
import { STREAMING_PLATFORMS } from '@/src/features/onboarding/constants';
import { getDetails, getDiscoverFeed, getProviders, getTrending } from '@/src/features/tmdb/client';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';

export type BuildFeedOptions = {
  mediaType?: MediaType;
  language?: string;
  now?: Date;
  mood?: MoodFilters;
};

const PLATFORM_PROVIDER_IDS = new Map(
  STREAMING_PLATFORMS.map((platform) => [platform.id, platform.tmdbProviderId]),
);

function mediaKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

function itemMediaType(item: MediaItem, fallback: MediaType): MediaType {
  return item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : fallback;
}

async function getHighRatedGenreIds(interactions: TitleInteraction[], language: string): Promise<Set<number>> {
  const rated = interactions
    .filter((interaction) => interaction.action === 'seen' && (interaction.rating ?? 0) >= 8)
    .slice(0, 8);

  const details = await Promise.all(
    rated.map((interaction) => getDetails(interaction.media_type, interaction.tmdb_id, language)),
  );

  return new Set(
    details.flatMap((detail) => detail?.genres.map((genre) => genre.id) ?? []),
  );
}

async function filterByProviders(
  items: MediaItem[],
  profile: Profile,
  mediaType: MediaType,
): Promise<MediaItem[]> {
  const wantedProviderIds = new Set(
    profile.platforms
      .map((platformId) => PLATFORM_PROVIDER_IDS.get(platformId))
      .filter((providerId): providerId is number => typeof providerId === 'number'),
  );

  if (!profile.region || wantedProviderIds.size === 0) {
    return items;
  }

  const checks = await Promise.all(
    items.slice(0, 30).map(async (item) => {
      const resolvedMediaType = itemMediaType(item, mediaType);
      const providers = await getProviders(resolvedMediaType, item.id, profile.region ?? undefined);
      const flatrate = providers?.flatrate ?? [];
      const hasProvider = flatrate.some((provider) => wantedProviderIds.has(provider.provider_id));
      return hasProvider ? item : null;
    }),
  );

  const filtered = checks.filter((item): item is MediaItem => item !== null);
  return filtered.length > 0 ? filtered : items;
}

export async function buildFeed(
  profile: Profile,
  interactions: TitleInteraction[],
  options: BuildFeedOptions = {},
): Promise<MediaItem[]> {
  const mediaType = options.mediaType ?? 'movie';
  const language = options.language ?? 'es-ES';
  const now = options.now ?? new Date();
  const blockedKeys = new Set<string>();

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

  const mood = options.mood;
  const moodActive = mood ? isMoodActive(mood) : false;

  const [moodCandidates, trending, discover, likedGenreIds] = await Promise.all([
    moodActive && mood ? fetchWithMood(profile, mood, { language }) : Promise.resolve([]),
    getTrending(mediaType, language),
    getDiscoverFeed({
      media_type: mediaType,
      region: profile.region ?? undefined,
      language,
      page: 1,
    }),
    getHighRatedGenreIds(interactions, language),
  ]);

  const deduped = new Map<string, MediaItem>();
  const baseItems = moodActive && moodCandidates.length > 0 ? moodCandidates : [...trending, ...discover];
  for (const item of baseItems) {
    const resolvedMediaType = itemMediaType(item, mediaType);
    const key = mediaKey(resolvedMediaType, item.id);
    if (!blockedKeys.has(key) && !deduped.has(key)) {
      deduped.set(key, { ...item, media_type: resolvedMediaType });
    }
  }

  const providerFiltered = await filterByProviders([...deduped.values()], profile, mediaType);

  return providerFiltered.sort((a, b) => {
    const aBoost = (a.genre_ids ?? []).some((genreId) => likedGenreIds.has(genreId)) ? 100 : 0;
    const bBoost = (b.genre_ids ?? []).some((genreId) => likedGenreIds.has(genreId)) ? 100 : 0;
    return b.popularity + bBoost - (a.popularity + aBoost);
  });
}
