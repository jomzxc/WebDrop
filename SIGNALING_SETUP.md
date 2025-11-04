# WebRTC Signaling Setup

## Important: Run the Signaling Table Script

The WebRTC peer-to-peer connections require a signaling table in the database to exchange connection information.

**You MUST run this SQL script in your Supabase project:**

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the script: `scripts/004_create_signaling_table.sql`
4. Also run: `scripts/005_enable_realtime.sql` to enable realtime on the signaling table

Without this table, peer connections will fail with "Failed to send connection signal" errors.

## What the Signaling Table Does

The signaling table temporarily stores WebRTC offers, answers, and ICE candidates that peers exchange to establish direct connections. Once connections are established, the signals are automatically cleaned up after 5 minutes.

## Verification

After running the scripts, verify the table exists:

\`\`\`sql
SELECT * FROM signaling LIMIT 1;
\`\`\`

You should see the table structure without errors.
