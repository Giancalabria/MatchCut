export type MediaType = 'movie' | 'tv';

export type TmdbAction =
  | 'discover'
  | 'details'
  | 'similar'
  | 'recommendations'
  | 'videos'
  | 'providers'
  | 'trending'
  | 'search';

export type TmdbListResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type Genre = {
  id: number;
  name: string;
};

export type ProductionCompany = {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
};

export type MediaItem = {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  adult?: boolean;
  origin_country?: string[];
};

export type MediaDetails = MediaItem & {
  credits?: {
    cast: CastMember[];
  };
  genres: Genre[];
  homepage: string | null;
  imdb_id?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  production_companies: ProductionCompany[];
  status: string;
  tagline: string | null;
};

export type CastMember = {
  id: number;
  cast_id?: number;
  character: string;
  name: string;
  order: number;
  profile_path: string | null;
};

export type WatchProvider = {
  display_priority: number;
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
};

export type RegionWatchProviders = {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  ads?: WatchProvider[];
  free?: WatchProvider[];
};

export type WatchProvidersResponse = {
  id: number;
  results: Record<string, RegionWatchProviders>;
};

export type VideoSite = 'YouTube' | 'Vimeo' | string;

export type VideoType = 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes' | string;

export type MediaVideo = {
  id: string;
  iso_3166_1: string;
  iso_639_1: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: VideoSite;
  size: number;
  type: VideoType;
};

export type VideosResponse = {
  id: number;
  results: MediaVideo[];
};

export type TmdbParams = {
  media_type?: MediaType;
  id?: number | string;
  region?: string;
  page?: number;
  with_genres?: string;
  with_runtime_lte?: number;
  with_watch_providers?: string;
  with_watch_monetization_types?: string;
  sort_by?: string;
  vote_count_gte?: number;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
  first_air_date_gte?: string;
  first_air_date_lte?: string;
  language?: string;
  query?: string;
};
