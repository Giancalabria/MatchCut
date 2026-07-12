const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

function imageUrl(path: string | null | undefined, size: PosterSize | BackdropSize): string | null {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function posterUrl(path: string | null | undefined, size: PosterSize = 'w500'): string | null {
  return imageUrl(path, size);
}

export function backdropUrl(path: string | null | undefined, size: BackdropSize = 'w1280'): string | null {
  return imageUrl(path, size);
}
