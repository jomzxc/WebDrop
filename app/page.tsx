"use client"

import { useState } from "react"
import RoomManager from "@/components/room-manager"
import FileTransferPanel from "@/components/file-transfer-panel"
import PeerList from "@/components/peer-list"
import Header from "@/components/header"

export default function Home() {
  const [roomId, setRoomId] = useState<string>("")
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<string[]>([])

  const handleJoinRoom = (id: string) => {
    setRoomId(id)
    setConnected(true)
  }

  const handleLeaveRoom = () => {
    setRoomId("")
    setConnected(false)
    setPeers([])
  }

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
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left Sidebar - Room Manager */}
              <div className="lg:col-span-4">
                <RoomManager
                  onJoinRoom={handleJoinRoom}
                  onLeaveRoom={handleLeaveRoom}
                  connected={connected}
                  roomId={roomId}
                />
              </div>

              {/* Right Content - File Transfer & Peers */}
              <div className="lg:col-span-8 space-y-6">
                {connected ? (
                  <>
                    <FileTransferPanel roomId={roomId} />
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
