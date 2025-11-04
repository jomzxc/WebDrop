"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PeerConnection } from "@/lib/webrtc/peer-connection"
import type { Peer } from "@/lib/types/database"

export function useRoom(roomId: string | null) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [connections, setConnections] = useState<Map<string, PeerConnection>>(new Map())
  const supabase = createClient()

  const fetchPeers = useCallback(async () => {
    if (!roomId) return

    const { data } = await supabase
      .from("peers")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true })

    if (data) {
      setPeers(data)
    }
  }, [roomId, supabase])

  useEffect(() => {
    if (!roomId) return

    fetchPeers()

    // Subscribe to peer changes
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peers",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchPeers()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, fetchPeers, supabase])

  const createRoom = async () => {
    const response = await fetch("/api/rooms/create", {
      method: "POST",
    })
    const data = await response.json()
    return data.room?.id
  }

  const joinRoom = async (id: string) => {
    const response = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: id }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error)
    return data.room
  }

  const leaveRoom = async (id: string) => {
    // Close all peer connections
    connections.forEach((conn) => conn.close())
    setConnections(new Map())

    await fetch("/api/rooms/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: id }),
    })
  }

  return {
    peers,
    connections,
    createRoom,
    joinRoom,
    leaveRoom,
  }
}
