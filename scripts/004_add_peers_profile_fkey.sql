-- Add foreign key constraint between peers and profiles
ALTER TABLE peers
ADD CONSTRAINT peers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_peers_user_id ON peers(user_id);
