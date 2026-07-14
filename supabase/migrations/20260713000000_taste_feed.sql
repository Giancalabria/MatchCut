-- Personalized feed: taste profile cache + shared title embeddings

alter table public.profiles
  add column if not exists taste_profile jsonb not null default '{}'::jsonb;

comment on column public.profiles.taste_profile is
  'Weighted taste signals (genres, decades, keywords) rebuilt by personalized-feed';

create table if not exists public.title_embeddings (
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null,
  model text not null default 'feature-v1',
  embedding double precision[] not null,
  dims integer not null,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (media_type, tmdb_id, model)
);

create index if not exists title_embeddings_updated_at_idx
  on public.title_embeddings (updated_at desc);

alter table public.title_embeddings enable row level security;

-- Shared catalog cache: any signed-in user can read embeddings.
create policy "title_embeddings_select_authenticated"
  on public.title_embeddings for select
  to authenticated
  using (true);

-- Writes go through Edge Functions with service role (no direct client inserts).
