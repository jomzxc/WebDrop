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
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()

    // Add user as peer (upsert to handle rejoining)
    const { error: peerError } = await supabase.from("peers").upsert(
      {
        room_id: sanitizedRoomId,
        user_id: user.id,
        username: profile?.username || user.email?.split("@")[0] || "Anonymous",
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "room_id,user_id",
      },
    )

    if (peerError) {
      return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
    }

    return NextResponse.json({ room })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
