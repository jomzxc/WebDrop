"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import RoomManager from "@/components/room-manager"
import FileTransferPanel from "@/components/file-transfer-panel"
import PeerList from "@/components/peer-list"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useRoom } from "@/lib/hooks/use-room"
import { useFileTransfer } from "@/lib/hooks/use-file-transfer"
import { PeerConnection } from "@/lib/webrtc/peer-connection"
import { useToast } from "@/hooks/use-toast"
import type { RealtimeChannel } from "@supabase/supabase-js"

export default function RoomPage() {
  const [roomId, setRoomId] = useState<string>("")
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [peerConnections, setPeerConnections] = useState<Map<string, PeerConnection>>(new Map())
  const [peerConnectionStates, setPeerConnectionStates] = useState<Map<string, string>>(new Map())
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const signalingChannelRef = useRef<RealtimeChannel | null>(null)
  const [isChannelReady, setIsChannelReady] = useState(false)
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const previousPeerIdsRef = useRef<Set<string>>(new Set())
  const pendingSignalsRef = useRef<Map<string, any[]>>(new Map())
  const peersRef = useRef<any[]>([])
  const refreshPeersRef = useRef<() => Promise<void>>()
  const createPeerConnectionRef = useRef<(peerId: string, username: string, isInitiator: boolean) => PeerConnection>()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { peers, onlineUserIds, isLoading, createRoom, joinRoom, leaveRoom, refreshPeers } = useRoom(
    connected ? roomId : null,
  )
  const { transfers, sendFile, handleFileMetadata, handleFileChunk, handleFileComplete } = useFileTransfer(roomId)

  const sendSignalRef = useRef<(toPeerId: string, signal: any) => Promise<void>>()

  useEffect(() => {
    const storedRoomId = sessionStorage.getItem("webdrop-roomId")
    if (storedRoomId) {
      setRoomId(storedRoomId)
      setConnected(true)
    }
  }, [])

  const createPeerConnection = useCallback(
    (peerId: string, username: string, isInitiator: boolean) => {
      const pc = new PeerConnection(peerId, isInitiator, (signal) => {
        sendSignalRef.current?.(peerId, signal)
      })

      pc.onData((data) => {
        if (!data || !data.type) return

        if (data.type === "file-metadata") {
          handleFileMetadata(data.metadata, username)
        } else if (data.type === "file-chunk") {
          handleFileChunk(data.chunk)
        } else if (data.type === "file-complete") {
          handleFileComplete(data.fileId)
        }
      })

      pc.onStateChange((state) => {
        setPeerConnectionStates((prevStates) => new Map(prevStates).set(peerId, state))
      })

      pc.onError((error) => {
        console.error("Connection error with", username, ":", error)
        toast({
          title: "Connection error",
          description: `Failed to connect to ${username}`,
          variant: "destructive",
        })
      })

      return pc
    },
    [handleFileMetadata, handleFileChunk, handleFileComplete, toast],
  )

  useEffect(() => {
    peersRef.current = peers
  }, [peers])

  useEffect(() => {
    refreshPeersRef.current = refreshPeers
  }, [refreshPeers])

  useEffect(() => {
    createPeerConnectionRef.current = createPeerConnection
  }, [createPeerConnection])

  useEffect(() => {
    peerConnectionsRef.current = peerConnections
  }, [peerConnections])

  sendSignalRef.current = async (toPeerId: string, signal: any) => {
    if (!user || !roomId || !signalingChannelRef.current || !isChannelReady) {
      return
    }

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
    } catch (error) {
      console.error("Failed to broadcast signal:", error)
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
    if (!connected || !user || !roomId) {
      setIsChannelReady(false)
      return
    }

    const channel = supabase.channel(`room:${roomId}:signaling`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: user.id },
      },
    })

    channel.on("broadcast", { event: "webrtc-hello" }, (payload) => {
      const { fromPeerId } = payload.payload
      if (!fromPeerId || fromPeerId === user.id) return

      const existingConnection = peerConnectionsRef.current.get(fromPeerId)
      if (existingConnection) {
        existingConnection.close()
      }

      const peer = peersRef.current.find((p) => p.user_id === fromPeerId)
      if (!peer) {
        return
      }

      const isInitiator = user.id < fromPeerId
      const pc = createPeerConnectionRef.current?.(peer.user_id, peer.username, isInitiator)
      if (!pc) return

      const newConnections = new Map(peerConnectionsRef.current)
      newConnections.set(fromPeerId, pc)
      setPeerConnections(newConnections)

      const newStates = new Map(peerConnectionStates)
      newStates.set(fromPeerId, "new")
      setPeerConnectionStates(newStates)

      if (isInitiator) {
        pc.createOffer().catch((error) => {
          console.error("Failed to create offer:", error)
        })
      }
    })

    channel.on("broadcast", { event: "webrtc-signal" }, async (payload) => {
      const { fromPeerId, toPeerId, signal } = payload.payload

      if (toPeerId !== user.id) {
        return
      }

      const connection = peerConnectionsRef.current.get(fromPeerId)

      if (!connection) {
        const buffer = pendingSignalsRef.current.get(fromPeerId) || []
        buffer.push(signal)
        pendingSignalsRef.current.set(fromPeerId, buffer)
        return
      }

      try {
        if (signal.type === "offer") {
          await connection.handleOffer(signal.offer)
        } else if (signal.type === "answer") {
          await connection.handleAnswer(signal.answer)
        } else if (signal.type === "ice-candidate") {
          await connection.handleIceCandidate(signal.candidate)
        }
      } catch (error) {
        console.error("Error handling signal:", error)
      }
    })

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        signalingChannelRef.current = channel
        setIsChannelReady(true)

        channel.send({
          type: "broadcast",
          event: "webrtc-hello",
          payload: { fromPeerId: user.id },
        })
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("Signaling channel error:", status)
        setIsChannelReady(false)
      } else if (status === "CLOSED") {
        setIsChannelReady(false)
      }
    })

    return () => {
      setIsChannelReady(false)
      signalingChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [connected, user, roomId])

  useEffect(() => {
    if (!connected || !user || !isChannelReady) {
      return
    }

    const currentPeerIds = new Set(peers.filter((p) => p.user_id !== user.id).map((p) => p.user_id))
    const previousPeerIds = previousPeerIdsRef.current

    const peersChanged =
      currentPeerIds.size !== previousPeerIds.size || Array.from(currentPeerIds).some((id) => !previousPeerIds.has(id))

    if (!peersChanged) {
      return
    }

    const timer = setTimeout(() => {
      const currentPeers = peers.filter((p) => p.user_id !== user.id)
      const newConnections = new Map(peerConnectionsRef.current)
      const newStates = new Map(peerConnectionStates)

      currentPeers.forEach((peer) => {
        if (!newConnections.has(peer.user_id)) {
          const isInitiator = user.id < peer.user_id
          const pc = createPeerConnectionRef.current?.(peer.user_id, peer.username, isInitiator)
          if (pc) {
            newConnections.set(peer.user_id, pc)
            newStates.set(peer.user_id, "new")

            const bufferedSignals = pendingSignalsRef.current.get(peer.user_id)
            if (bufferedSignals && bufferedSignals.length > 0) {
              bufferedSignals.forEach(async (signal) => {
                try {
                  if (signal.type === "offer") {
                    await pc.handleOffer(signal.offer)
                  } else if (signal.type === "answer") {
                    await pc.handleAnswer(signal.answer)
                  } else if (signal.type === "ice-candidate") {
                    await pc.handleIceCandidate(signal.candidate)
                  }
                } catch (error) {
                  console.error("Error processing buffered signal:", error)
                }
              })
              pendingSignalsRef.current.delete(peer.user_id)
            }

            if (isInitiator) {
              setTimeout(() => {
                pc.createOffer().catch((error) => {
                  console.error("Failed to create offer:", error)
                  toast({
                    title: "Connection failed",
                    description: "Could not establish peer connection",
                    variant: "destructive",
                  })
                })
              }, 500)
            }
          }
        }
      })

      Array.from(newConnections.keys()).forEach((peerId) => {
        if (!currentPeerIds.has(peerId)) {
          newConnections.get(peerId)?.close()
          newConnections.delete(peerId)
          newStates.delete(peerId)
          pendingSignalsRef.current.delete(peerId)
        }
      })

      setPeerConnections(newConnections)
      setPeerConnectionStates(newStates)
      previousPeerIdsRef.current = currentPeerIds
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [connected, user, isChannelReady, peers, toast, createPeerConnection])

  useEffect(() => {
    return () => {
      if (peerConnectionsRef.current.size > 0) {
        peerConnectionsRef.current.forEach((conn) => conn.close())
      }
      pendingSignalsRef.current.clear()
    }
  }, [])

  const handleJoinRoom = async (id: string) => {
    try {
      let finalRoomId = id

      if (id === "create") {
        finalRoomId = await createRoom()
      } else {
        await joinRoom(id)
        finalRoomId = id
      }

      sessionStorage.setItem("webdrop-roomId", finalRoomId)
      setRoomId(finalRoomId)
      setConnected(true)
    } catch (error: any) {
      console.error("Failed to join room:", error)
    }
  }

  const handleLeaveRoom = async () => {
    peerConnections.forEach((pc) => pc.close())
    setPeerConnections(new Map())
    setPeerConnectionStates(new Map())
    previousPeerIdsRef.current = new Set()
    pendingSignalsRef.current.clear()
    setIsChannelReady(false)

    const channel = signalingChannelRef.current
    if (channel) {
      await channel.untrack()
    }
    signalingChannelRef.current = null

    await leaveRoom(roomId)

    sessionStorage.removeItem("webdrop-roomId")
    setRoomId("")
    setConnected(false)
  }

  const handleFileSelect = useCallback(
    (files: FileList, peerId: string) => {
      const peer = peersRef.current.find((p) => p.user_id === peerId)
      const connection = peerConnectionsRef.current.get(peerId)

      if (!peer || !connection) {
        toast({
          title: "Connection not ready",
          description: "Peer connection not established yet",
          variant: "destructive",
        })
        return
      }

      const connectionState = connection.getConnectionState()

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
    [toast, sendFile],
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

  const isReadyToTransfer = Array.from(peerConnectionStates.entries()).some(([peerId, state]) => {
    return onlineUserIds.has(peerId) && state === "connected"
  })

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
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 flex-1">
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
                  isReadyToTransfer={isReadyToTransfer}
                />
              </div>

              <div className="lg:col-span-8 space-y-6">
                {connected ? (
                  <>
                    <FileTransferPanel
                      roomId={roomId}
                      transfers={transfers}
                      peers={peersRef.current}
                      onFileSelect={handleFileSelect}
                      currentUserId={user.id}
                    />
                    <PeerList
                      peers={peersRef.current}
                      onRefresh={refreshPeersRef.current}
                      currentUserId={user.id}
                      connectionStates={peerConnectionStates}
                      onlineUserIds={onlineUserIds}
                    />
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

      <Footer />
    </main>
  )
}
