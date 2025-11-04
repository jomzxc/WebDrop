"use client"

import { Card } from "@/components/ui/card"
import { Users, Zap } from "lucide-react"

interface PeerListProps {
  peers: string[]
}

export default function PeerList({ peers }: PeerListProps) {
  // Mock data for demonstration
  const mockPeers = [
    { id: "1", name: "Alice Johnson", status: "connected" as const },
    { id: "2", name: "Bob Smith", status: "connected" as const },
    { id: "3", name: "Charlie Brown", status: "idle" as const },
  ]

  return (
    <Card className="p-8 space-y-6 backdrop-blur-xl border border-border/50 bg-card/40 shadow-2xl rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Connected Peers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mockPeers.length} peer{mockPeers.length !== 1 ? "s" : ""} active
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {mockPeers.map((peer) => (
            <div
              key={peer.id}
              className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary/80 flex items-center justify-center font-bold text-primary-foreground text-sm shadow-lg">
                  {peer.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{peer.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${peer.status === "connected" ? "bg-green-500" : "bg-yellow-500"}`}
                    />
                    <p className="text-xs text-muted-foreground capitalize">{peer.status}</p>
                  </div>
                </div>
              </div>
              {peer.status === "connected" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 rounded-lg">
                  <Zap className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">Live</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {mockPeers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-medium">Waiting for peers to join...</p>
          </div>
        )}
      </div>
    </Card>
  )
}
