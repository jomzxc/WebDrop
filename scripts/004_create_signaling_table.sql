-- Create signaling table for WebRTC signal exchange
CREATE TABLE IF NOT EXISTS signaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(8) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_peer_id UUID NOT NULL,
  to_peer_id UUID NOT NULL,
  signal_type VARCHAR(20) NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_signaling_room_to_peer ON signaling(room_id, to_peer_id, created_at DESC);

-- Enable RLS
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert signals in their rooms"
  ON signaling FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM peers
      WHERE peers.room_id = signaling.room_id
      AND peers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read signals addressed to them"
  ON signaling FOR SELECT
  TO authenticated
  USING (
    to_peer_id = auth.uid()
    OR from_peer_id = auth.uid()
  );

-- Auto-delete old signals after 5 minutes
CREATE OR REPLACE FUNCTION delete_old_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM signaling
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
