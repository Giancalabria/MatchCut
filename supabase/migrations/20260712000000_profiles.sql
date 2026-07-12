-- Match Cut: profiles + RLS + auto-create on signup
-- Apply with: supabase db push  OR  run in SQL Editor

create extension if not exists "pgcrypto" with schema extensions;

create type public.nope_policy as enum ('restore_only', 'session', 'cooldown');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  region text,
  platforms text[] not null default '{}',
  nope_policy public.nope_policy not null default 'cooldown',
  nope_cooldown_days integer default 90,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nope_cooldown_days_check check (
    nope_cooldown_days is null or nope_cooldown_days > 0
  )
);

create index profiles_region_idx on public.profiles (region);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
