-- Create profiles table for user management
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create rooms table
create table if not exists public.rooms (
  id text primary key,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

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
