import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId, signal, targetPeerId } = await request.json()

    if (!roomId || !signal || !targetPeerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user is in the room
    const { data: peer } = await supabase
      .from("peers")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single()

    if (!peer) {
      return NextResponse.json({ error: "Not in room" }, { status: 403 })
    }

    // Store signal for target peer
    const { error: signalError } = await supabase.from("signaling").insert({
      room_id: roomId,
      from_peer_id: user.id,
      to_peer_id: targetPeerId,
      signal_type: signal.type,
      signal_data: signal,
    })

    if (signalError) {
      console.error("[v0] Signaling database error:", signalError)
      return NextResponse.json({ error: "Failed to send signal", details: signalError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Signal route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
