export type GenreOption = {
  id: number;
  nameKey: string;
};

/** TMDB movie genre ids (common subset). */
export const MOVIE_GENRES: GenreOption[] = [
  { id: 28, nameKey: 'genres.action' },
  { id: 12, nameKey: 'genres.adventure' },
  { id: 16, nameKey: 'genres.animation' },
  { id: 35, nameKey: 'genres.comedy' },
  { id: 80, nameKey: 'genres.crime' },
  { id: 99, nameKey: 'genres.documentary' },
  { id: 18, nameKey: 'genres.drama' },
  { id: 10751, nameKey: 'genres.family' },
  { id: 14, nameKey: 'genres.fantasy' },
  { id: 27, nameKey: 'genres.horror' },
  { id: 9648, nameKey: 'genres.mystery' },
  { id: 10749, nameKey: 'genres.romance' },
  { id: 878, nameKey: 'genres.scifi' },
  { id: 53, nameKey: 'genres.thriller' },
];

export const TV_GENRES: GenreOption[] = [
  { id: 10759, nameKey: 'genres.actionAdventure' },
  { id: 16, nameKey: 'genres.animation' },
  { id: 35, nameKey: 'genres.comedy' },
  { id: 80, nameKey: 'genres.crime' },
  { id: 99, nameKey: 'genres.documentary' },
  { id: 18, nameKey: 'genres.drama' },
  { id: 10751, nameKey: 'genres.family' },
  { id: 10765, nameKey: 'genres.scifiFantasy' },
  { id: 9648, nameKey: 'genres.mystery' },
  { id: 10749, nameKey: 'genres.romance' },
];

export const RUNTIME_PRESETS = [90, 120, 150] as const;
