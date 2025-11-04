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
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { peers, isLoading, createRoom, joinRoom, leaveRoom, refreshPeers } = useRoom(connected ? roomId : null)
  const { transfers, sendFile, handleFileMetadata, handleFileChunk, handleFileComplete } = useFileTransfer(roomId)

  const sendSignal = useCallback(
    async (toPeerId: string, signal: any) => {
      if (!user || !roomId || !signalingChannelRef.current || !isChannelReady) {
        console.log("[v0] Cannot send signal - channel not ready")
        return
      }

      console.log("[v0] Broadcasting signal to peer:", toPeerId, "Type:", signal.type)

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

        console.log("[v0] Signal broadcast successfully")
      } catch (error) {
        console.error("[v0] Failed to broadcast signal:", error)
        toast({
          title: "Signaling error",
          description: "Failed to send connection signal",
          variant: "destructive",
        })
      }
    },
    [user, roomId, isChannelReady, toast],
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.push("/auth/login")
      } else {
        setUser(user)
      }
      setIsAuthLoading(false)
    })
  }, [router, supabase])

  useEffect(() => {
    if (!connected || !user || !roomId) {
      setIsChannelReady(false)
      return
    }

    console.log("[v0] Setting up signaling channel for room:", roomId)

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false, ack: true },
      },
    })

    channel
      .on("broadcast", { event: "webrtc-signal" }, async (payload) => {
        const { fromPeerId, toPeerId, signal } = payload.payload

        if (toPeerId !== user.id) return

        console.log("[v0] Received signal:", signal.type, "from:", fromPeerId)
        const connection = peerConnections.get(fromPeerId)

        if (!connection) {
          console.error("[v0] No connection found for peer:", fromPeerId)
          return
        }

        try {
          if (signal.type === "offer") {
            console.log("[v0] Handling offer from:", fromPeerId)
            await connection.handleOffer(signal.offer)
          } else if (signal.type === "answer") {
            console.log("[v0] Handling answer from:", fromPeerId)
            await connection.handleAnswer(signal.answer)
          } else if (signal.type === "ice-candidate") {
            console.log("[v0] Handling ICE candidate from:", fromPeerId)
            await connection.handleIceCandidate(signal.candidate)
          }
        } catch (error) {
          console.error("[v0] Error handling signal:", error)
        }
      })
      .subscribe((status) => {
        console.log("[v0] Signaling channel status:", status)
        if (status === "SUBSCRIBED") {
          signalingChannelRef.current = channel
          setIsChannelReady(true)
          console.log("[v0] Signaling channel ready")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsChannelReady(false)
          toast({
            title: "Connection error",
            description: "Failed to establish signaling channel",
            variant: "destructive",
          })
        }
      })

    return () => {
      console.log("[v0] Cleaning up signaling channel")
      setIsChannelReady(false)
      signalingChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [connected, user, roomId, peerConnections, supabase, toast])

  useEffect(() => {
    if (!connected || !user || !isChannelReady) return

    const currentPeers = peers.filter((p) => p.user_id !== user.id)
    const newConnections = new Map(peerConnections)

    currentPeers.forEach((peer) => {
      if (!newConnections.has(peer.user_id)) {
        console.log("[v0] Creating connection to peer:", peer.username, "Initiator:", user.id < peer.user_id)

        const pc = new PeerConnection(peer.user_id, user.id < peer.user_id, (signal) => {
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
          console.log("[v0] Connection state changed:", peer.username, "->", state)
        })

        pc.onError((error) => {
          console.error("[v0] Connection error with", peer.username, ":", error)
          toast({
            title: "Connection error",
            description: `Failed to connect to ${peer.username}`,
            variant: "destructive",
          })
        })

        if (user.id < peer.user_id) {
          console.log("[v0] Creating offer for peer:", peer.username)
          pc.createOffer().catch((error) => {
            console.error("[v0] Failed to create offer:", error)
            toast({
              title: "Connection failed",
              description: "Could not establish peer connection",
              variant: "destructive",
            })
          })
        }

        newConnections.set(peer.user_id, pc)
      }
    })

    Array.from(newConnections.keys()).forEach((peerId) => {
      if (!peers.find((p) => p.user_id === peerId)) {
        console.log("[v0] Closing connection to peer:", peerId)
        newConnections.get(peerId)?.close()
        newConnections.delete(peerId)
      }
    })

    setPeerConnections(newConnections)

    return () => {
      newConnections.forEach((conn) => conn.close())
    }
  }, [
    peers,
    connected,
    user,
    isChannelReady,
    handleFileMetadata,
    handleFileChunk,
    handleFileComplete,
    toast,
    sendSignal,
  ])

  const handleJoinRoom = async (id: string) => {
    try {
      let finalRoomId = id

      if (id === "create") {
        finalRoomId = await createRoom()
      } else {
        await joinRoom(id)
        finalRoomId = id
      }

      setRoomId(finalRoomId)
      setConnected(true)
    } catch (error: any) {}
  }

  const handleLeaveRoom = async () => {
    peerConnections.forEach((pc) => pc.close())
    setPeerConnections(new Map())
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

      console.log("[v0] File select - Peer:", peer?.username, "Connection:", connection?.getConnectionState())

      if (!peer || !connection) {
        toast({
          title: "Connection not ready",
          description: "Peer connection not established yet",
          variant: "destructive",
        })
        return
      }

      const connectionState = connection.getConnectionState()
      console.log("[v0] Connection state:", connectionState)

      if (connectionState !== "connected") {
        toast({
          title: "Connection not ready",
          description: `Connection state: ${connectionState}. Please wait...`,
          variant: "destructive",
        })
        return
      }

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
