"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { PeerConnection } from "@/lib/webrtc/peer-connection"
import type { Peer } from "@/lib/types/database"

export function useRoom(roomId: string | null) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [connections, setConnections] = useState<Map<string, PeerConnection>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
        console.log("[v0] Fetched peers:", data.length, "peers")
        setPeers(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching peers:", error)
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
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    console.log("[v0] Setting up room subscription for:", roomId)

    fetchPeers()

    pollingIntervalRef.current = setInterval(() => {
      console.log("[v0] Polling for peer updates...")
      fetchPeers()
    }, 3000)

    const channel = supabase
      .channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: "" },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "peers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[v0] Realtime event received:", payload.eventType, payload)

          fetchPeers()
        },
      )
      .subscribe((status, err) => {
        console.log("[v0] Subscription status:", status)
        if (err) {
          console.error("[v0] Subscription error:", err)
          toast({
            title: "Realtime connection issue",
            description: "Using polling fallback for updates",
            variant: "default",
          })
        }
        if (status === "SUBSCRIBED") {
          console.log("[v0] Realtime subscription active!")
        }
      })

    return () => {
      console.log("[v0] Cleaning up room subscription")
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      supabase.removeChannel(channel)
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
    connections,
    isLoading,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshPeers: fetchPeers,
  }
}
