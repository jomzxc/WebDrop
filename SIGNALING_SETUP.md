# WebRTC Signaling Setup

## Current Implementation

WebDrop now uses **Supabase Realtime Broadcast** for WebRTC signaling instead of a database table. This means:

✅ **No SQL scripts required** - Signaling works out of the box
✅ **Real-time communication** - Signals are broadcast instantly between peers
✅ **Simpler architecture** - No database writes for ephemeral signaling data

## How It Works

1. When a peer needs to send a WebRTC signal (offer, answer, or ICE candidate), it broadcasts the signal through Supabase Realtime
2. All peers in the room receive the broadcast
3. Each peer checks if the signal is meant for them (by checking `toPeerId`)
4. The target peer processes the signal and establishes the WebRTC connection

## Troubleshooting

If peer connections are not establishing:

1. **Check browser console** - Look for `[v0]` prefixed logs showing signal flow
2. **Verify both peers are subscribed** - You should see "Signaling broadcast subscription status: SUBSCRIBED"
3. **Check connection states** - Look for "Connection state changed" logs
4. **Network issues** - Ensure both peers can reach STUN/TURN servers for NAT traversal

## Connection Flow

\`\`\`
User 1 (Initiator)          User 2 (Responder)
      |                            |
      |------ Broadcast Offer ---->|
      |                            |
      |<----- Broadcast Answer ----|
      |                            |
      |<-> Exchange ICE Candidates |
      |                            |
      |==== WebRTC Connected! =====|
\`\`\`

## No Database Setup Required

The previous implementation required running SQL scripts to create a signaling table. This is **no longer necessary**. Signaling now uses Supabase Realtime's broadcast feature, which requires no database setup.

If you see errors about a missing "signaling" table, you can safely ignore them - the app no longer uses that table.
