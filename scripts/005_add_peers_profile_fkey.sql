-- Add foreign key constraint between peers and profiles
ALTER TABLE public.peers
DROP CONSTRAINT IF EXISTS peers_user_id_fkey;

ALTER TABLE public.peers
ADD CONSTRAINT peers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_peers_user_id ON public.peers(user_id);