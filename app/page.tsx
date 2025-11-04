"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import RoomManager from "@/components/room-manager"
import FileTransferPanel from "@/components/file-transfer-panel"
import PeerList from "@/components/peer-list"
import Header from "@/components/header"
import { useRoom } from "@/lib/hooks/use-room"
import { useFileTransfer } from "@/lib/hooks/use-file-transfer"
import { PeerConnection } from "@/lib/webrtc/peer-connection"
import { useToast } from "@/hooks/use-toast"
import type { RealtimeChannel } from "@supabase/supabase-js"

export default function Home() {
  const [roomId, setRoomId] = useState<string>("")
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [peerConnections, setPeerConnections] = useState<Map<string, PeerConnection>>(new Map())
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const signalingChannelRef = useRef<RealtimeChannel | null>(null)
  const [isChannelReady, setIsChannelReady] = useState(false)
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const previousPeerIdsRef = useRef<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { peers, isLoading, createRoom, joinRoom, leaveRoom, refreshPeers } = useRoom(connected ? roomId : null)
  const { transfers, sendFile, handleFileMetadata, handleFileChunk, handleFileComplete } = useFileTransfer(roomId)

  const sendSignalRef = useRef<(toPeerId: string, signal: any) => Promise<void>>()

  useEffect(() => {
    peerConnectionsRef.current = peerConnections
  }, [peerConnections])

  sendSignalRef.current = async (toPeerId: string, signal: any) => {
    if (!user || !roomId || !signalingChannelRef.current || !isChannelReady) {
      console.log("[v0] ❌ Cannot send signal - channel not ready:", {
        hasUser: !!user,
        hasRoomId: !!roomId,
        hasChannel: !!signalingChannelRef.current,
        isChannelReady,
      })
      return
    }

    console.log("[v0] 📡 Broadcasting signal:", {
      from: user.id.substring(0, 8),
      to: toPeerId.substring(0, 8),
      type: signal.type,
    })

    try {
      await signalingChannelRef.current.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: {
          fromPeerId: user.id,
          toPeerId,
          signal,
        },
      })

      console.log("[v0] ✅ Signal broadcast successfully")
    } catch (error) {
      console.error("[v0] ❌ Failed to broadcast signal:", error)
      toast({
        title: "Signaling error",
        description: "Failed to send connection signal",
        variant: "destructive",
      })
    }
  }

  const sendSignal = useCallback((toPeerId: string, signal: any) => {
    return sendSignalRef.current?.(toPeerId, signal) || Promise.resolve()
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.push("/auth/login")
      } else {
        setUser(user)
        console.log("[v0] 👤 User authenticated:", user.id.substring(0, 8))
      }
      setIsAuthLoading(false)
    })
  }, [router, supabase])

  useEffect(() => {
    if (!connected || !user || !roomId) {
      setIsChannelReady(false)
      return
    }

    console.log("[v0] 🔌 Setting up signaling channel for room:", roomId)

    const channel = supabase.channel(`room:${roomId}:signaling`, {
      config: {
        broadcast: { self: false, ack: false },
      },
    })

    channel.on("broadcast", { event: "webrtc-signal" }, async (payload) => {
      const { fromPeerId, toPeerId, signal } = payload.payload

      console.log("[v0] 📨 Received broadcast:", {
        from: fromPeerId.substring(0, 8),
        to: toPeerId.substring(0, 8),
        type: signal.type,
        isForMe: toPeerId === user.id,
      })

      if (toPeerId !== user.id) {
        console.log("[v0] ⏭️  Signal not for me, ignoring")
        return
      }

      const connection = peerConnectionsRef.current.get(fromPeerId)

      if (!connection) {
        console.error("[v0] ❌ No connection found for peer:", fromPeerId.substring(0, 8))
        console.log(
          "[v0] Available connections:",
          Array.from(peerConnectionsRef.current.keys()).map((id) => id.substring(0, 8)),
        )
        return
      }

      try {
        if (signal.type === "offer") {
          console.log("[v0] 📥 Handling offer from:", fromPeerId.substring(0, 8))
          await connection.handleOffer(signal.offer)
        } else if (signal.type === "answer") {
          console.log("[v0] 📥 Handling answer from:", fromPeerId.substring(0, 8))
          await connection.handleAnswer(signal.answer)
        } else if (signal.type === "ice-candidate") {
          console.log("[v0] 🧊 Handling ICE candidate from:", fromPeerId.substring(0, 8))
          await connection.handleIceCandidate(signal.candidate)
        }
      } catch (error) {
        console.error("[v0] ❌ Error handling signal:", error)
      }
    })

    channel.subscribe((status) => {
      console.log("[v0] 📡 Signaling channel subscription status:", status)

      if (status === "SUBSCRIBED") {
        console.log("[v0] ✅ Signaling channel SUBSCRIBED - setting ready")
        signalingChannelRef.current = channel
        setIsChannelReady(true)
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("[v0] ❌ Signaling channel error:", status)
        setIsChannelReady(false)
      } else if (status === "CLOSED") {
        console.log("[v0] 🔒 Signaling channel closed")
        setIsChannelReady(false)
      }
    })

    return () => {
      console.log("[v0] 🧹 Cleaning up signaling channel")
      setIsChannelReady(false)
      signalingChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [connected, user, roomId])

  useEffect(() => {
    if (!connected || !user || !isChannelReady) {
      console.log("[v0] ⏸️  Not ready for peer connections:", { connected, hasUser: !!user, isChannelReady })
      return
    }

    const currentPeerIds = new Set(peers.filter((p) => p.user_id !== user.id).map((p) => p.user_id))
    const previousPeerIds = previousPeerIdsRef.current

    // Check if peer list actually changed
    const peersChanged =
      currentPeerIds.size !== previousPeerIds.size || Array.from(currentPeerIds).some((id) => !previousPeerIds.has(id))

    if (!peersChanged) {
      // Peer list hasn't changed, don't recreate connections
      return
    }

    console.log("[v0] 👥 Peer list changed, updating connections")
    previousPeerIdsRef.current = currentPeerIds

    // Add a small delay to ensure the other peer's signaling channel is also ready
    const timer = setTimeout(() => {
      const currentPeers = peers.filter((p) => p.user_id !== user.id)
      const newConnections = new Map(peerConnections)

      console.log(
        "[v0] 🔗 Current peers to connect:",
        currentPeers.map((p) => ({
          id: p.user_id.substring(0, 8),
          username: p.username,
        })),
      )

      // Add new peer connections
      currentPeers.forEach((peer) => {
        if (!newConnections.has(peer.user_id)) {
          const isInitiator = user.id < peer.user_id
          console.log("[v0] 🆕 Creating connection to peer:", {
            username: peer.username,
            peerId: peer.user_id.substring(0, 8),
            isInitiator,
          })

          const pc = new PeerConnection(peer.user_id, isInitiator, (signal) => {
            console.log("[v0] 📤 PeerConnection wants to send signal:", signal.type)
            sendSignal(peer.user_id, signal)
          })

          pc.onData((data) => {
            if (!data || !data.type) return

            if (data.type === "file-metadata") {
              handleFileMetadata(data.metadata, peer.username)
            } else if (data.type === "file-chunk") {
              handleFileChunk(data.chunk)
            } else if (data.type === "file-complete") {
              handleFileComplete(data.fileId)
            }
          })

          pc.onStateChange((state) => {
            console.log("[v0] 🔄 Connection state changed:", {
              peer: peer.username,
              peerId: peer.user_id.substring(0, 8),
              state,
            })
          })

          pc.onError((error) => {
            console.error("[v0] ❌ Connection error with", peer.username, ":", error)
            toast({
              title: "Connection error",
              description: `Failed to connect to ${peer.username}`,
              variant: "destructive",
            })
          })

          newConnections.set(peer.user_id, pc)

          if (isInitiator) {
            console.log("[v0] 🚀 Creating offer for peer:", peer.username)
            setTimeout(() => {
              pc.createOffer().catch((error) => {
                console.error("[v0] ❌ Failed to create offer:", error)
                toast({
                  title: "Connection failed",
                  description: "Could not establish peer connection",
                  variant: "destructive",
                })
              })
            }, 500)
          } else {
            console.log("[v0] ⏳ Waiting for offer from peer:", peer.username)
          }
        }
      })

      // Clean up connections for peers that left
      Array.from(newConnections.keys()).forEach((peerId) => {
        if (!currentPeerIds.has(peerId)) {
          console.log("[v0] 🗑️  Peer left, closing connection:", peerId.substring(0, 8))
          newConnections.get(peerId)?.close()
          newConnections.delete(peerId)
        }
      })

      setPeerConnections(newConnections)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [
    peers,
    connected,
    user,
    isChannelReady,
    peerConnections,
    handleFileMetadata,
    handleFileChunk,
    handleFileComplete,
    toast,
    sendSignal,
  ])

  useEffect(() => {
    return () => {
      if (peerConnections.size > 0) {
        console.log("[v0] 🧹 Component unmounting, cleaning up all peer connections")
        peerConnections.forEach((conn) => conn.close())
      }
    }
  }, [])

  const handleJoinRoom = async (id: string) => {
    try {
      let finalRoomId = id

      if (id === "create") {
        console.log("[v0] 🏗️  Creating new room")
        finalRoomId = await createRoom()
      } else {
        console.log("[v0] 🚪 Joining room:", id)
        await joinRoom(id)
        finalRoomId = id
      }

      setRoomId(finalRoomId)
      setConnected(true)
      console.log("[v0] ✅ Connected to room:", finalRoomId)
    } catch (error: any) {
      console.error("[v0] ❌ Failed to join room:", error)
    }
  }

  const handleLeaveRoom = async () => {
    console.log("[v0] 👋 Leaving room")
    peerConnections.forEach((pc) => pc.close())
    setPeerConnections(new Map())
    previousPeerIdsRef.current = new Set()
    setIsChannelReady(false)
    signalingChannelRef.current = null
    await leaveRoom(roomId)
    setRoomId("")
    setConnected(false)
  }

  const handleFileSelect = useCallback(
    (files: FileList, peerId: string) => {
      const peer = peers.find((p) => p.user_id === peerId)
      const connection = peerConnections.get(peerId)

      console.log("[v0] 📁 File select:", {
        peer: peer?.username,
        peerId: peerId.substring(0, 8),
        hasConnection: !!connection,
        connectionState: connection?.getConnectionState(),
      })

      if (!peer || !connection) {
        toast({
          title: "Connection not ready",
          description: "Peer connection not established yet",
          variant: "destructive",
        })
        return
      }

      const connectionState = connection.getConnectionState()
      console.log("[v0] 🔍 Connection state check:", connectionState)

      if (connectionState !== "connected") {
        toast({
          title: "Connection not ready",
          description: `Connection state: ${connectionState}. Please wait...`,
          variant: "destructive",
        })
        return
      }

      console.log("[v0] ✅ Starting file transfer")
      Array.from(files).forEach((file) => {
        sendFile(file, peerId, peer.username, (data) => {
          connection.sendData(data)
        })
      })
    },
    [peers, peerConnections, sendFile, toast],
  )

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              <div className="lg:col-span-4">
                <RoomManager
                  onJoinRoom={handleJoinRoom}
                  onLeaveRoom={handleLeaveRoom}
                  connected={connected}
                  roomId={roomId}
                  isLoading={isLoading}
                />
              </div>

              <div className="lg:col-span-8 space-y-6">
                {connected ? (
                  <>
                    <FileTransferPanel
                      roomId={roomId}
                      transfers={transfers}
                      peers={peers}
                      onFileSelect={handleFileSelect}
                    />
                    <PeerList peers={peers} onRefresh={refreshPeers} />
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="text-6xl text-muted-foreground/30">∿</div>
                      <p className="text-lg text-muted-foreground font-medium">Join or create a room to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
