-- Create a new public bucket for avatars.
INSERT INTO storage.buckets (id, name, "public")
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow anyone to read (SELECT) avatars
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');


-- RLS Policy: Allow users to upload (INSERT) their *own* avatar
--
-- This policy simply compares the text of the user's ID to the text
-- of the filename before the first '.'
-- This avoids all casting errors.
--
DROP POLICY IF EXISTS "Allow individual avatar upload" ON storage.objects;
CREATE POLICY "Allow individual avatar upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(name, '.', 1)
);


-- RLS Policy: Allow users to update (UPDATE) their *own* avatar
--
-- Applying the same safe, text-based logic to the UPDATE policy.
--
DROP POLICY IF EXISTS "Allow individual avatar update" ON storage.objects;
CREATE POLICY "Allow individual avatar update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(name, '.', 1)
);