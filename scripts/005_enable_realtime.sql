-- Enable realtime for peers table
alter publication supabase_realtime add table public.peers;

-- Enable realtime for signaling table
alter publication supabase_realtime add table public.signaling;

-- Enable realtime for rooms table
alter publication supabase_realtime add table public.rooms;
