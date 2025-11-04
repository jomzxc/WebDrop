import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { roomId } = await request.json()

  // Check if room exists and is active
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
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
      room_id: roomId,
      user_id: user.id,
      username: profile?.username || user.email?.split("@")[0] || "Anonymous",
      last_seen: new Date().toISOString(),
    },
    {
      onConflict: "room_id,user_id",
    },
  )

  if (peerError) {
    return NextResponse.json({ error: peerError.message }, { status: 500 })
  }

  return NextResponse.json({ room })
}
