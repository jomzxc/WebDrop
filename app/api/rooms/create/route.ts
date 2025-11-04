import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const roomId = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        id: roomId,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create room:", error)
      return NextResponse.json({ error: "Failed to create room. Please try again." }, { status: 500 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()

    // Add creator as first peer
    const { error: peerError } = await supabase.from("peers").insert({
      room_id: roomId,
      user_id: user.id,
      username: profile?.username || user.email?.split("@")[0] || "Anonymous",
      last_seen: new Date().toISOString(),
    })

    if (peerError) {
      console.error("Failed to create peer:", peerError)
      await supabase.from("rooms").delete().eq("id", roomId)
      return NextResponse.json({ error: "Failed to initialize room" }, { status: 500 })
    }

    return NextResponse.json({ room: data })
  } catch (error) {
    console.error("Create room error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
