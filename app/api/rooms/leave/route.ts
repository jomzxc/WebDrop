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

    // Remove user from peers
    const { error: deleteError } = await supabase.from("peers").delete().eq("room_id", roomId).eq("user_id", user.id)

    if (deleteError) {
      return NextResponse.json({ error: "Failed to leave room" }, { status: 500 })
    }

    // Check if room is empty
    const { data: peers, error: peersError } = await supabase.from("peers").select("id").eq("room_id", roomId)

    if (peersError) {
      return NextResponse.json({ success: true })
    }

    // If no peers left, deactivate room
    if (!peers || peers.length === 0) {
      await supabase.from("rooms").update({ is_active: false }).eq("id", roomId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
