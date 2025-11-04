"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Zap, RefreshCw, AlertCircle, Loader2 } from "lucide-react"
import type { Peer } from "@/lib/types/database"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PeerListProps {
  peers: Peer[]
  onRefresh?: () => void
  connectionStates: Map<string, string>
  currentUserId: string
  onlineUserIds: Set<string>
}

export default function PeerList({ peers, onRefresh, connectionStates, currentUserId, onlineUserIds }: PeerListProps) {
  const otherPeers = peers.filter((p) => p.user_id !== currentUserId)

  // Helper function to get initials
  const getInitials = (name: string) => {
    return name ? name.slice(0, 2).toUpperCase() : "P"
  }

  const getStatusVisuals = (state: string) => {
    switch (state) {
      case "connected":
        return {
          dot: "w-1.5 h-1.5 rounded-full bg-green-500",
          text: "Connected",
          badge: (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">Live</span>
            </div>
          ),
        }
      case "connecting":
      case "new":
        return {
          dot: "w-1.5 h-1.5 rounded-full bg-yellow-500",
          text: "Connecting...",
          badge: (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Connecting</span>
            </div>
          ),
        }
      default: // 'disconnected', 'failed', 'closed', or any other state
        return {
          dot: "w-1.5 h-1.5 rounded-full bg-red-500",
          text: "Offline", // Changed from Disconnected
          badge: (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">Offline</span>
            </div>
          ),
        }
    }
  }

  return (
    <Card className="p-8 space-y-6 backdrop-blur-xl border border-border/50 bg-card/40 shadow-2xl rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Connected Peers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {otherPeers.length} peer{otherPeers.length !== 1 ? "s" : ""} active
              </p>
            </div>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 bg-transparent">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {otherPeers.map((peer) => {
            const isOnline = onlineUserIds.has(peer.user_id)
            const state = isOnline ? connectionStates.get(peer.user_id) || "connecting" : "offline"
            const status = getStatusVisuals(state)

            return (
              <div
                key={peer.id}
                className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl transition-all hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={peer.avatar_url || "/placeholder.svg"} alt={peer.username} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                      {getInitials(peer.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{peer.username}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={status.dot} />
                      <p className="text-xs text-muted-foreground">{status.text}</p>
                    </div>
                  </div>
                </div>
                {status.badge}
              </div>
            )
          })}
        </div>

        {otherPeers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-medium">Waiting for peers to join...</p>
          </div>
        )}
      </div>
    </Card>
  )
}
