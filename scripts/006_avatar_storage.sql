-- Create a new public bucket for avatars.
-- Public buckets are space-efficient as they don't require signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow anyone to read (SELECT) avatars
-- This is needed so the public URLs work in the <img> tags.
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- RLS Policy: Allow users to upload (INSERT) their *own* avatar
-- We enforce that the file name MUST be their user_id. (e.g., 'user-id-123.png')
-- This is highly secure and space-efficient.
CREATE POLICY "Allow individual avatar upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.filename(name)::uuid)
);

-- RLS Policy: Allow users to update (UPDATE) their *own* avatar
CREATE POLICY "Allow individual avatar update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.filename(name)::uuid)
);
