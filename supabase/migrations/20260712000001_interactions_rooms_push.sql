-- Match Cut: interactions, rooms, matches, and push token support

-- On hosted Supabase, pgcrypto lives in `extensions` (not public search_path).
create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists expo_push_token text;

create table if not exists public.title_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  action text not null,
  rating integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint title_interactions_media_type_check check (media_type in ('movie', 'tv')),
  constraint title_interactions_action_check check (action in ('like', 'nope', 'seen')),
  constraint title_interactions_rating_check check (rating is null or rating between 1 and 10),
  constraint title_interactions_user_title_unique unique (user_id, tmdb_id, media_type)
);

create index if not exists title_interactions_user_action_idx
  on public.title_interactions (user_id, action, updated_at desc);

create index if not exists title_interactions_title_idx
  on public.title_interactions (tmdb_id, media_type);

alter table public.title_interactions enable row level security;

drop policy if exists "title_interactions_select_own" on public.title_interactions;
create policy "title_interactions_select_own"
  on public.title_interactions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "title_interactions_insert_own" on public.title_interactions;
create policy "title_interactions_insert_own"
  on public.title_interactions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "title_interactions_update_own" on public.title_interactions;
create policy "title_interactions_update_own"
  on public.title_interactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "title_interactions_delete_own" on public.title_interactions;
create policy "title_interactions_delete_own"
  on public.title_interactions for delete
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists title_interactions_set_updated_at on public.title_interactions;
create trigger title_interactions_set_updated_at
  before update on public.title_interactions
  for each row execute function public.set_updated_at();

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  catalog_owner_id uuid references public.profiles (id) on delete set null,
  -- Prefer uuid slice over gen_random_bytes: works without extensions in search_path.
  invite_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  platform_strategy text not null default 'intersection',
  mood jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_invite_code_unique unique (invite_code),
  constraint rooms_platform_strategy_check check (
    platform_strategy in ('intersection', 'catalog_owner', 'union', 'full')
  )
);

create index if not exists rooms_host_id_idx on public.rooms (host_id);
create index if not exists rooms_invite_code_idx on public.rooms (invite_code);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  constraint room_members_role_check check (role in ('host', 'member'))
);

create index if not exists room_members_user_id_idx on public.room_members (user_id);

create table if not exists public.room_swipes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  vote text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_swipes_member_fk foreign key (room_id, user_id)
    references public.room_members (room_id, user_id) on delete cascade,
  constraint room_swipes_media_type_check check (media_type in ('movie', 'tv')),
  constraint room_swipes_vote_check check (vote in ('yes', 'no', 'seen')),
  constraint room_swipes_member_title_unique unique (room_id, user_id, tmdb_id, media_type)
);

create index if not exists room_swipes_room_title_idx
  on public.room_swipes (room_id, tmdb_id, media_type);

create index if not exists room_swipes_user_idx
  on public.room_swipes (user_id, updated_at desc);

create table if not exists public.room_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  matched_at timestamptz not null default now(),
  constraint room_matches_media_type_check check (media_type in ('movie', 'tv')),
  constraint room_matches_room_title_unique unique (room_id, tmdb_id, media_type)
);

create index if not exists room_matches_room_matched_at_idx
  on public.room_matches (room_id, matched_at desc);

create or replace function public.room_is_member(room_id uuid, user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = $1
      and rm.user_id = $2
  );
$$;

create or replace function public.room_is_host(room_id uuid, user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = $1
      and r.host_id = $2
  );
$$;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_swipes enable row level security;
alter table public.room_matches enable row level security;

drop policy if exists "rooms_select_member" on public.rooms;
create policy "rooms_select_member"
  on public.rooms for select
  to authenticated
  using (public.room_is_member(id));

drop policy if exists "rooms_insert_host" on public.rooms;
create policy "rooms_insert_host"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = host_id);

drop policy if exists "rooms_update_host" on public.rooms;
create policy "rooms_update_host"
  on public.rooms for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

drop policy if exists "rooms_delete_host" on public.rooms;
create policy "rooms_delete_host"
  on public.rooms for delete
  to authenticated
  using (auth.uid() = host_id);

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

drop policy if exists "room_members_select_room_member" on public.room_members;
create policy "room_members_select_room_member"
  on public.room_members for select
  to authenticated
  using (public.room_is_member(room_id));

drop policy if exists "room_members_insert_self_or_host" on public.room_members;
create policy "room_members_insert_self_or_host"
  on public.room_members for insert
  to authenticated
  with check (public.room_is_host(room_id));

drop policy if exists "room_members_update_host" on public.room_members;
create policy "room_members_update_host"
  on public.room_members for update
  to authenticated
  using (public.room_is_host(room_id))
  with check (public.room_is_host(room_id));

drop policy if exists "room_members_delete_self_or_host" on public.room_members;
create policy "room_members_delete_self_or_host"
  on public.room_members for delete
  to authenticated
  using (user_id = auth.uid() or public.room_is_host(room_id));

drop policy if exists "room_swipes_select_room_member" on public.room_swipes;
create policy "room_swipes_select_room_member"
  on public.room_swipes for select
  to authenticated
  using (public.room_is_member(room_id));

drop policy if exists "room_swipes_insert_own_member_vote" on public.room_swipes;
create policy "room_swipes_insert_own_member_vote"
  on public.room_swipes for insert
  to authenticated
  with check (user_id = auth.uid() and public.room_is_member(room_id));

drop policy if exists "room_swipes_update_own_member_vote" on public.room_swipes;
create policy "room_swipes_update_own_member_vote"
  on public.room_swipes for update
  to authenticated
  using (user_id = auth.uid() and public.room_is_member(room_id))
  with check (user_id = auth.uid() and public.room_is_member(room_id));

drop policy if exists "room_swipes_delete_own_or_host" on public.room_swipes;
create policy "room_swipes_delete_own_or_host"
  on public.room_swipes for delete
  to authenticated
  using (user_id = auth.uid() or public.room_is_host(room_id));

drop trigger if exists room_swipes_set_updated_at on public.room_swipes;
create trigger room_swipes_set_updated_at
  before update on public.room_swipes
  for each row execute function public.set_updated_at();

drop policy if exists "room_matches_select_room_member" on public.room_matches;
create policy "room_matches_select_room_member"
  on public.room_matches for select
  to authenticated
  using (public.room_is_member(room_id));

drop policy if exists "room_matches_insert_room_member" on public.room_matches;
create policy "room_matches_insert_room_member"
  on public.room_matches for insert
  to authenticated
  with check (public.room_is_member(room_id));

create or replace function public.insert_room_match_when_unanimous_yes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
  yes_count integer;
begin
  if new.vote <> 'yes' then
    return new;
  end if;

  select count(*)
  into member_count
  from public.room_members rm
  where rm.room_id = new.room_id;

  select count(distinct rs.user_id)
  into yes_count
  from public.room_swipes rs
  join public.room_members rm
    on rm.room_id = rs.room_id
   and rm.user_id = rs.user_id
  where rs.room_id = new.room_id
    and rs.tmdb_id = new.tmdb_id
    and rs.media_type = new.media_type
    and rs.vote = 'yes';

  if member_count > 0 and yes_count = member_count then
    insert into public.room_matches (room_id, tmdb_id, media_type)
    values (new.room_id, new.tmdb_id, new.media_type)
    on conflict (room_id, tmdb_id, media_type) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists room_swipes_insert_match on public.room_swipes;
create trigger room_swipes_insert_match
  after insert or update on public.room_swipes
  for each row execute function public.insert_room_match_when_unanimous_yes();

create or replace function public.join_room_by_code(invite_code_input text)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.rooms;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_room
  from public.rooms
  where invite_code = upper(trim(invite_code_input));

  if target_room.id is null then
    raise exception 'Room not found';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (target_room.id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;

  return target_room;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.room_matches;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
