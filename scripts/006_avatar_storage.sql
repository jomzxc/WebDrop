-- Create a new public bucket for avatars.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow anyone to read (SELECT) avatars
-- (Dropping first to ensure it's updated)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- RLS Policy: Allow users to upload (INSERT) their *own* avatar
-- We now split the filename at '.' and take the first part *before* casting to UUID.
DROP POLICY IF EXISTS "Allow individual avatar upload" ON storage.objects;
CREATE POLICY "Allow individual avatar upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = (split_part(storage.filename(name), '.', 1)::uuid)
);

-- RLS Policy: Allow users to update (UPDATE) their *own* avatar
DROP POLICY IF EXISTS "Allow individual avatar update" ON storage.objects;
CREATE POLICY "Allow individual avatar update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (split_part(storage.filename(name), '.', 1)::uuid)
);
