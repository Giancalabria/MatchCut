-- Taste preferences from calibration (genre boosts without proxy ratings)

alter table public.profiles
  add column if not exists liked_genre_ids integer[] not null default '{}',
  add column if not exists disliked_genre_ids integer[] not null default '{}';
