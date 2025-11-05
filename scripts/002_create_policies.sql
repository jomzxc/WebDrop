-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.peers enable row level security;
alter table public.file_transfers enable row level security;

-- Profiles policies
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Rooms policies
create policy "rooms_select_active"
  on public.rooms for select
  using (is_active = true);

create policy "rooms_insert_authenticated"
  on public.rooms for insert
  with check (auth.uid() = created_by);

create policy "rooms_update_if_empty"
  on public.rooms for update
  using (
    auth.uid() = created_by AND
    NOT EXISTS (
      SELECT 1 FROM public.peers
      WHERE peers.room_id = rooms.id
      AND peers.user_id != auth.uid()
    )
  );

create policy "rooms_delete_if_empty"
  on public.rooms for delete
  using (
    auth.uid() = created_by AND
    NOT EXISTS (
      SELECT 1 FROM public.peers
      WHERE peers.room_id = rooms.id
      AND peers.user_id != auth.uid()
    )
  );

-- Peers policies
create policy "peers_select_all"
  on public.peers for select
  using (true);

create policy "peers_insert_own"
  on public.peers for insert
  with check (auth.uid() = user_id);

create policy "peers_update_own"
  on public.peers for update
  using (auth.uid() = user_id);

create policy "peers_delete_own"
  on public.peers for delete
  using (auth.uid() = user_id);

-- File transfers policies
create policy "file_transfers_select_involved"
  on public.file_transfers for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "file_transfers_insert_own"
  on public.file_transfers for insert
  with check (auth.uid() = sender_id);

create policy "file_transfers_update_involved"
  on public.file_transfers for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
