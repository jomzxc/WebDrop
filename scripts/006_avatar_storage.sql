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
-- This policy now uses a Regex to safely check the name format *before*
-- trying to cast any part of it to a UUID.
--
DROP POLICY IF EXISTS "Allow individual avatar upload" ON storage.objects;
CREATE POLICY "Allow individual avatar upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  -- 1. Check for the pattern: [uuid].[extension]
  --    e.g., ecd24961-3b02-4dff-80dc-064113a443b7.jpg
  name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-zA-Z0-9]+$' AND
  -- 2. Only if it matches, check if the UUID part matches the user's ID
  auth.uid() = (split_part(name, '.', 1)::uuid)
);


-- RLS Policy: Allow users to update (UPDATE) their *own* avatar
--
-- Applying the same safe logic to the UPDATE policy.
--
DROP POLICY IF EXISTS "Allow individual avatar update" ON storage.objects;
CREATE POLICY "Allow individual avatar update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-zA-Z0-9]+$' AND
  auth.uid() = (split_part(name, '.', 1)::uuid)
);
