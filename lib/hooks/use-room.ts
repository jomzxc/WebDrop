"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { PeerConnection } from "@/lib/webrtc/peer-connection"
import type { Peer } from "@/lib/types/database"

export function useRoom(roomId: string | null) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  const [connections, setConnections] = useState<Map<string, PeerConnection>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const fetchPeers = useCallback(async () => {
    if (!roomId) return

    try {
      const { data, error } = await supabase
        .from("peers")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true })

      if (error) throw error

      if (data) {
        setPeers(data)
      }
    } catch (error) {
      console.error("Error fetching peers:", error)
      toast({
        title: "Failed to fetch peers",
        description: "Could not load room participants",
        variant: "destructive",
      })
    }
  }, [roomId, supabase, toast])

  useEffect(() => {
    if (!roomId) {
      setPeers([])
      setOnlineUserIds(new Set())
      return
    }

    let channel: ReturnType<typeof supabase.channel> | null = null

    const setupChannel = async () => {
      // We need the user to track presence
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch the initial list of peers
      fetchPeers()

      channel = supabase.channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true },
          // --- ADDED PRESENCE ---
          presence: { key: user.id },
        },
      })

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          fetchPeers()
        },
      )

      channel
        .on("presence", { event: "sync" }, () => {
          // 'sync' event fires when we first join, giving us the current state
          const state = channel!.presenceState()
          const userIds = new Set(Object.keys(state))
          setOnlineUserIds(userIds)
        })
        .on("presence", { event: "join" }, ({ newPresences }) => {
          // A user came online
          setOnlineUserIds((prev) => new Set([...prev, ...newPresences.map((p) => p.key)]))
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          // A user went offline (closed tab, lost connection)
          setOnlineUserIds((prev) => {
            const next = new Set(prev)
            leftPresences.forEach((p) => next.delete(p.key))
            return next
          })
        })

      channel.subscribe(async (status, err) => {
        if (err) {
          console.error("Subscription error:", err)
          toast({
            title: "Realtime connection issue",
            description: "Could not connect to room updates",
            variant: "destructive",
          })
          return
        }

        if (status === "SUBSCRIBED") {
          await channel!.track({})
        }
      })
    }

    setupChannel()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [roomId, fetchPeers, supabase, toast])

  const createRoom = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to create room")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: "Room created",
        description: `Room ID: ${data.room?.id}`,
      })

      return data.room?.id
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create room"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const joinRoom = async (id: string) => {
    if (!id || id.length !== 8) {
      throw new Error("Invalid room ID. Must be 8 characters.")
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: id.toUpperCase() }),
      })

      if (!response.ok) {
        throw new Error("Failed to join room")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: "Joined room",
        description: `Connected to room ${id}`,
      })

      return data.room
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to join room"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const leaveRoom = async (id: string) => {
    setIsLoading(true)
    try {
      connections.forEach((conn) => conn.close())
      setConnections(new Map())

      const response = await fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: id }),
      })

      if (!response.ok) {
        throw new Error("Failed to leave room")
      }

      setPeers([])

      toast({
        title: "Left room",
        description: "Disconnected from room",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave room properly",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    peers,
    onlineUserIds,
    connections,
    isLoading,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshPeers: fetchPeers,
  }
}
