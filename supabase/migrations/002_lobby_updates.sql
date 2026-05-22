-- Add missing columns to rooms
alter table public.rooms
  add column if not exists bot_count int not null default 0,
  add column if not exists creator_user_id uuid,
  add column if not exists owner_user_id uuid;

-- Enable full replica identity on players so realtime DELETE payloads
-- include all columns (required for filtering and payload.old.user_id)
alter table public.players replica identity full;

-- Allow room owners to kick players (delete their rows)
drop policy if exists "players_delete" on public.players;
create policy "players_delete" on public.players for delete using (
  auth.uid() = user_id
  or auth.uid()::text = (
    select owner_user_id from public.rooms where id = room_id
  )
);
