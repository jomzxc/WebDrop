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

    const { error: deleteError } = await supabase
      .from("peers")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id)

    if (deleteError) {
      return NextResponse.json({ error: "Failed to leave room" }, { status: 500 })
    }

    const { error: roomDeleteError } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId)

    if (roomDeleteError) {
      // This error is expected if the room is not empty
      console.warn("Failed to delete room (likely not empty):", roomDeleteError.message)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
