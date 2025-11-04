"use client"

import { useEffect, useState, useCallback } from "react"
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
      return
    }

    console.log("[v0] Setting up room subscription for:", roomId)

    fetchPeers()

    const channel = supabase
      .channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true }, // Changed to true to receive own changes
          presence: { key: "" },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "peers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[v0] Peer INSERT detected:", payload.new)
          setPeers((current) => {
            const exists = current.some((p) => p.id === payload.new.id)
            if (exists) return current
            return [...current, payload.new as Peer]
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "peers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[v0] Peer UPDATE detected:", payload.new)
          setPeers((current) => current.map((p) => (p.id === payload.new.id ? (payload.new as Peer) : p)))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "peers",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[v0] Peer DELETE detected:", payload.old)
          setPeers((current) => current.filter((p) => p.id !== payload.old.id))
        },
      )
      .subscribe((status, err) => {
        console.log("[v0] Subscription status:", status)
        if (err) {
          console.error("[v0] Subscription error:", err)
        }
        if (status === "SUBSCRIBED") {
          console.log("[v0] Subscription active, refetching peers")
          fetchPeers()
        }
      })

    return () => {
      console.log("[v0] Cleaning up room subscription")
      supabase.removeChannel(channel)
    }
  }, [roomId, fetchPeers, supabase])

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
      // Close all peer connections
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
  }
}
