-- Enable realtime for peers table
alter publication supabase_realtime add table public.peers;

-- Enable realtime for rooms table
alter publication supabase_realtime add table public.rooms;
