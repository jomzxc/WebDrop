import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()

  // Add creator as first peer
  await supabase.from("peers").insert({
    room_id: roomId,
    user_id: user.id,
    username: profile?.username || user.email?.split("@")[0] || "Anonymous",
  })

  return NextResponse.json({ room: data })
}
