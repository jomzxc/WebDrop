"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Zap, RefreshCw } from "lucide-react"
import type { Peer } from "@/lib/types/database"

interface PeerListProps {
  peers: Peer[]
  onRefresh?: () => void
}

export default function PeerList({ peers, onRefresh }: PeerListProps) {
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
                {peers.length} peer{peers.length !== 1 ? "s" : ""} active
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
          {peers.map((peer) => (
            <div
              key={peer.id}
              className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary/80 flex items-center justify-center font-bold text-primary-foreground text-sm shadow-lg">
                  {peer.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{peer.username}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <p className="text-xs text-muted-foreground">Connected</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Live</span>
              </div>
            </div>
          ))}
        </div>

        {peers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-medium">Waiting for peers to join...</p>
          </div>
        )}
      </div>
    </Card>
  )
}
