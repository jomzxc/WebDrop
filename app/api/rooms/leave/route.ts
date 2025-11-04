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

  // Remove user from peers
  await supabase.from("peers").delete().eq("room_id", roomId).eq("user_id", user.id)

  // Check if room is empty
  const { data: peers } = await supabase.from("peers").select("id").eq("room_id", roomId)

  // If no peers left, deactivate room
  if (!peers || peers.length === 0) {
    await supabase.from("rooms").update({ is_active: false }).eq("id", roomId)
  }

  return NextResponse.json({ success: true })
}
