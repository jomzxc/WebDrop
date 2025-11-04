-- Create profiles table for user management
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

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

-- Create rooms table
create table if not exists public.rooms (
  id text primary key,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Enable RLS on rooms
alter table public.rooms enable row level security;

-- Rooms policies - anyone can view active rooms, only creator can update/delete
create policy "rooms_select_active"
  on public.rooms for select
  using (is_active = true);

create policy "rooms_insert_authenticated"
  on public.rooms for insert
  with check (auth.uid() = created_by);

create policy "rooms_update_own"
  on public.rooms for update
  using (auth.uid() = created_by);

create policy "rooms_delete_own"
  on public.rooms for delete
  using (auth.uid() = created_by);

-- Create peers table to track who's in which room
create table if not exists public.peers (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  username text not null,
  joined_at timestamp with time zone default now(),
  last_seen timestamp with time zone default now(),
  unique(room_id, user_id)
);

-- Enable RLS on peers
alter table public.peers enable row level security;

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

-- Create file_transfers table to track transfer history
create table if not exists public.file_transfers (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- Enable RLS on file_transfers
alter table public.file_transfers enable row level security;

-- File transfers policies - users can see transfers they're involved in
create policy "file_transfers_select_involved"
  on public.file_transfers for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "file_transfers_insert_own"
  on public.file_transfers for insert
  with check (auth.uid() = sender_id);

create policy "file_transfers_update_involved"
  on public.file_transfers for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
