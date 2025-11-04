"use client"

import { useState, useEffect, useCallback } from "react"
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

export default function Home() {
  const [roomId, setRoomId] = useState<string>("")
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [peerConnections, setPeerConnections] = useState<Map<string, PeerConnection>>(new Map())
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { peers, isLoading, createRoom, joinRoom, leaveRoom } = useRoom(connected ? roomId : null)
  const { transfers, sendFile, handleFileMetadata, handleFileChunk, handleFileComplete } = useFileTransfer(roomId)

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
    if (!connected || !user) return

    const currentPeers = peers.filter((p) => p.user_id !== user.id)
    const newConnections = new Map(peerConnections)

    currentPeers.forEach((peer) => {
      if (!newConnections.has(peer.user_id)) {
        const pc = new PeerConnection(peer.user_id, user.id < peer.user_id, (signal) => {})

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

        pc.onError((error) => {
          toast({
            title: "Connection error",
            description: `Failed to connect to ${peer.username}`,
            variant: "destructive",
          })
        })

        if (user.id < peer.user_id) {
          pc.createOffer().catch((error) => {
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
      if (!currentPeers.find((p) => p.user_id === peerId)) {
        newConnections.get(peerId)?.close()
        newConnections.delete(peerId)
      }
    })

    setPeerConnections(newConnections)

    return () => {
      newConnections.forEach((conn) => conn.close())
    }
  }, [peers, connected, user, handleFileMetadata, handleFileChunk, handleFileComplete, toast])

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
    await leaveRoom(roomId)
    setRoomId("")
    setConnected(false)
  }

  const handleFileSelect = useCallback(
    (files: FileList, peerId: string) => {
      const peer = peers.find((p) => p.user_id === peerId)
      const connection = peerConnections.get(peerId)

      if (!peer || !connection) {
        toast({
          title: "Connection not ready",
          description: "Peer connection not established yet",
          variant: "destructive",
        })
        return
      }

      if (connection.getConnectionState() !== "connected") {
        toast({
          title: "Connection not ready",
          description: "Wait for peer connection to establish",
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
                    <PeerList peers={peers} />
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
