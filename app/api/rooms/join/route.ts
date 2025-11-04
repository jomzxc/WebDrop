import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId } = body

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
    }

    const sanitizedRoomId = roomId.trim().toUpperCase()

    if (sanitizedRoomId.length !== 8) {
      return NextResponse.json({ error: "Room ID must be 8 characters" }, { status: 400 })
    }

    if (!/^[A-Z0-9]+$/.test(sanitizedRoomId)) {
      return NextResponse.json({ error: "Room ID contains invalid characters" }, { status: 400 })
    }

    // Check if room exists and is active
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", sanitizedRoomId)
      .eq("is_active", true)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found or inactive" }, { status: 404 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single()

    const { data: existingPeer } = await supabase
      .from("peers")
      .select("*")
      .eq("room_id", sanitizedRoomId)
      .eq("user_id", user.id)
      .single()

    if (existingPeer) {
      const { error: updateError } = await supabase
        .from("peers")
        .update({
          last_seen: new Date().toISOString(),
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        })
        .eq("id", existingPeer.id)

      if (updateError) {
        console.error("Failed to update peer:", updateError)
      }

      return NextResponse.json({ room, peer: existingPeer })
    }

    const { data: newPeer, error: peerError } = await supabase
      .from("peers")
      .insert({
        room_id: sanitizedRoomId,
        user_id: user.id,
        username: profile?.username || user.email?.split("@")[0] || "Anonymous",
        last_seen: new Date().toISOString(),
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      })
      .select()
      .single()

    if (peerError) {
      console.error("Failed to create peer:", peerError)
      return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
    }

    return NextResponse.json({ room, peer: newPeer })
  } catch (error) {
    console.error("Join room error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
