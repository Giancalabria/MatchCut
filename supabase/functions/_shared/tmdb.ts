/** TMDB helpers for Edge Functions. */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export type MediaType = 'movie' | 'tv';

export type TmdbListItem = {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
};

export type TmdbDetails = TmdbListItem & {
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{ id: number; order?: number }>;
    crew?: Array<{ id: number; job?: string }>;
  };
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
    results?: Array<{ id: number; name: string }>;
  };
};

function tmdbToken(): string {
  const token = Deno.env.get('TMDB_ACCESS_TOKEN');
  if (!token) {
    throw new Error('TMDB_ACCESS_TOKEN is not configured');
  }
  return token;
}

export async function tmdbFetch<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tmdbToken()}`,
      Accept: 'application/json',
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(typeof body?.status_message === 'string' ? body.status_message : `TMDB ${response.status}`);
  }
  return body as T;
}

export async function fetchDetails(mediaType: MediaType, id: number, language: string): Promise<TmdbDetails> {
  return tmdbFetch<TmdbDetails>(`/${mediaType}/${id}`, {
    language,
    append_to_response: 'credits,keywords',
  });
}

export async function fetchSimilar(
  mediaType: MediaType,
  id: number,
  language: string,
  page = 1,
): Promise<TmdbListItem[]> {
  const body = await tmdbFetch<{ results?: TmdbListItem[] }>(`/${mediaType}/${id}/similar`, {
    language,
    page: String(page),
  });
  return body.results ?? [];
}

export async function fetchRecommendations(
  mediaType: MediaType,
  id: number,
  language: string,
  page = 1,
): Promise<TmdbListItem[]> {
  const body = await tmdbFetch<{ results?: TmdbListItem[] }>(`/${mediaType}/${id}/recommendations`, {
    language,
    page: String(page),
  });
  return body.results ?? [];
}

export async function fetchDiscover(
  mediaType: MediaType,
  language: string,
  params: Record<string, string | undefined>,
): Promise<TmdbListItem[]> {
  const body = await tmdbFetch<{ results?: TmdbListItem[] }>(`/discover/${mediaType}`, {
    language,
    ...params,
  });
  return body.results ?? [];
}

export async function fetchTrending(mediaType: MediaType, language: string): Promise<TmdbListItem[]> {
  const body = await tmdbFetch<{ results?: TmdbListItem[] }>(`/trending/${mediaType}/week`, { language });
  return body.results ?? [];
}

export function keywordIdsFromDetails(details: TmdbDetails): number[] {
  const fromMovie = details.keywords?.keywords?.map((item) => item.id) ?? [];
  const fromTv = details.keywords?.results?.map((item) => item.id) ?? [];
  return [...fromMovie, ...fromTv];
}

export function castIdsFromDetails(details: TmdbDetails): number[] {
  return (details.credits?.cast ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 8)
    .map((member) => member.id);
}

export function directorIdsFromDetails(details: TmdbDetails): number[] {
  return (details.credits?.crew ?? [])
    .filter((member) => member.job === 'Director' || member.job === 'Creator')
    .slice(0, 2)
    .map((member) => member.id);
}
