import { CALIBRATION_MOVIE_IDS } from '@/src/features/onboarding/calibrationTitles';
import { getDetails } from '@/src/features/tmdb/client';
import type { MediaItem } from '@/src/features/tmdb/types';

export async function loadCalibrationDeck(language = 'es-ES'): Promise<MediaItem[]> {
  const details = await Promise.all(
    CALIBRATION_MOVIE_IDS.map((id) => getDetails('movie', id, language)),
  );

  return details
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => ({
      id: item.id,
      media_type: 'movie' as const,
      title: item.title,
      original_title: item.original_title,
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      genre_ids: item.genres?.map((genre) => genre.id) ?? item.genre_ids,
      vote_average: item.vote_average,
      vote_count: item.vote_count,
      popularity: item.popularity,
      release_date: item.release_date,
    }));
}
