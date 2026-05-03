-- Tennis-Ticker: Initial Schema

-- profiles: created automatically on signup via trigger
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null,
  email        text not null,
  avatar_url   text,
  invited_by   uuid references public.profiles(id),
  created_at   timestamptz default now()
);

-- invitations: controls invite-only access
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  invited_by   uuid references public.profiles(id),
  accepted_at  timestamptz,
  created_at   timestamptz default now()
);

-- encounters: a match day / club event grouping multiple matches
create table public.encounters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  title        text,
  date         date not null,
  location     text,
  created_by   uuid references public.profiles(id),
  share_token  text unique default gen_random_uuid()::text,
  created_at   timestamptz default now()
);

-- matches: a single match within an encounter
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  encounter_id    uuid references public.encounters(id) on delete cascade,
  type            text not null check (type in ('singles', 'doubles')),
  order_index     int not null default 0,

  -- players (player2/4 null for singles)
  player1_name    text not null,
  player2_name    text,
  player3_name    text not null,
  player4_name    text,

  -- match configuration
  num_sets        int not null default 3,
  games_per_set   int not null default 6,
  tiebreak_sets   boolean not null default true,
  match_tiebreak  boolean not null default true,
  no_ad           boolean not null default false,

  -- status
  status          text not null default 'pending' check (status in ('pending','running','finished','cancelled')),

  -- edit rights
  edit_holder_id  uuid references public.profiles(id),
  edit_status     text not null default 'free' check (edit_status in ('free','locked')),
  edit_token      text unique default gen_random_uuid()::text,

  -- result
  winner_team     int check (winner_team in (1, 2)),
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now()
);

-- sets: individual sets within a match
create table public.sets (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references public.matches(id) on delete cascade,
  set_number  int not null,
  games_team1 int not null default 0,
  games_team2 int not null default 0,
  is_tiebreak boolean not null default false,
  winner_team int check (winner_team in (1, 2)),
  started_at  timestamptz,
  finished_at timestamptz
);

-- score_events: append-only event log (source of truth for undo)
create table public.score_events (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid references public.matches(id) on delete cascade,
  set_id       uuid references public.sets(id),
  event_type   text not null check (event_type in ('point','undo','correction','serve_change')),
  scoring_team int check (scoring_team in (1, 2)),
  point_before jsonb,
  point_after  jsonb,
  server_team  int check (server_team in (1, 2)),
  created_by   uuid references public.profiles(id),
  created_at   timestamptz default now(),
  is_undone    boolean not null default false
);

-- edit_requests: for requesting edit rights from the current holder
create table public.edit_requests (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid references public.matches(id) on delete cascade,
  requester_id uuid references public.profiles(id),
  status       text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at   timestamptz default now()
);

-- subscriptions: web push subscriptions per match or encounter
create table public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id),  -- null = anonymous web push
  push_endpoint     text not null,
  push_keys         jsonb not null,  -- {p256dh, auth}
  encounter_id      uuid references public.encounters(id) on delete cascade,
  match_id          uuid references public.matches(id) on delete cascade,
  notify_on_game    boolean not null default false,
  notify_on_set     boolean not null default true,
  notify_on_match   boolean not null default true,
  created_at        timestamptz default now()
);

-- trigger: create profile automatically when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
