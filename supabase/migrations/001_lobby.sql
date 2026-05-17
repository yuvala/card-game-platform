-- Lobby schema: rooms + players
-- Run this in the Supabase SQL Editor

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'done')),
  max_players int not null default 2,
  ws_url text,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

alter table public.rooms enable row level security;
alter table public.players enable row level security;

create policy "rooms_read"   on public.rooms   for select using (true);
create policy "rooms_insert" on public.rooms   for insert with check (auth.uid() is not null);
create policy "rooms_update" on public.rooms   for update using (true);

create policy "players_read"   on public.players for select using (true);
create policy "players_insert" on public.players for insert with check (auth.uid() = user_id);
create policy "players_delete" on public.players for delete using (auth.uid() = user_id);
