"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Copy, Plus, LogOut, Zap } from "lucide-react"

interface RoomManagerProps {
  onJoinRoom: (roomId: string) => void
  onLeaveRoom: () => void
  connected: boolean
  roomId: string
  isLoading?: boolean
  isReadyToTransfer?: boolean
}

export default function RoomManager({
  onJoinRoom,
  onLeaveRoom,
  connected,
  roomId,
  isLoading,
  isReadyToTransfer,
}: RoomManagerProps) {
  const [inputValue, setInputValue] = useState("")
  const [copied, setCopied] = useState(false)

  const handleCreateRoom = () => {
    if (isLoading) return
    onJoinRoom("create")
  }

  const handleJoinRoom = () => {
    if (!inputValue.trim()) return

    const trimmedValue = inputValue.trim().toUpperCase()

    if (trimmedValue.length !== 8) {
      return
    }

    if (!/^[A-Z0-9]+$/.test(trimmedValue)) {
      return
    }

    if (isLoading) return

    onJoinRoom(trimmedValue)
    setInputValue("")
  }

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = roomId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="sticky top-24 p-6 space-y-6 backdrop-blur-xl border border-border/50 bg-card/40 shadow-2xl rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Connection Hub
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create a new room or join an existing one using a room ID
          </p>
        </div>

        {!connected ? (
          <div className="space-y-4">
            <Button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground py-6 text-lg font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Room
                </>
              )}
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-card/40 text-muted-foreground font-medium">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Enter room ID (8 characters)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
                className="px-4 py-3 text-base rounded-xl transition-all bg-muted/40 border-border/50 focus:border-accent/50 focus:bg-muted/60 placeholder-muted-foreground/50"
                maxLength={8}
                disabled={isLoading}
              />
              <Button
                onClick={handleJoinRoom}
                disabled={!inputValue.trim() || inputValue.trim().length !== 8 || isLoading}
                variant="outline"
                className="w-full py-3 rounded-xl border-border/50 hover:bg-muted/50 transition-all disabled:opacity-50 bg-transparent disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  "Join Room"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/40 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-bold">Connected Room</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-3xl font-bold text-accent">{roomId}</p>
                <Button
                  onClick={handleCopyRoomId}
                  variant="ghost"
                  size="sm"
                  className="text-accent hover:bg-accent/20 transition-all hover:scale-110"
                  aria-label="Copy room ID"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-accent mt-3 font-semibold animate-pulse">✓ Copied to clipboard</p>}
            </div>

            <div
              className={`flex gap-3 p-4 ${
                isReadyToTransfer
                  ? "from-green-500/15 to-green-500/5 border-green-500/40"
                  : "from-yellow-500/15 to-yellow-500/5 border-yellow-500/40"
              } border rounded-xl`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                  isReadyToTransfer ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Connected</p>
                <p className="text-xs text-muted-foreground">
                  {isReadyToTransfer ? "Ready to transfer files" : "Waiting for peers to connect..."}
                </p>
              </div>
            </div>

            <Button
              onClick={onLeaveRoom}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-red-500/10 hover:from-red-500/30 hover:to-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 hover:border-red-500/60 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
