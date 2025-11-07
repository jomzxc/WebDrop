"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle2, AlertCircle, Download, Send, X } from "lucide-react"
import type { Transfer } from "@/lib/hooks/use-file-transfer"
import type { Peer } from "@/lib/types/database"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FileTransferPanelProps {
  roomId: string
  transfers: Transfer[]
  peers: Peer[]
  onFileSelect: (files: FileList, peerId: string) => void
  currentUserId: string
}

export default function FileTransferPanel({
  roomId,
  transfers,
  peers,
  onFileSelect,
  currentUserId,
}: FileTransferPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPeer, setSelectedPeer] = useState<string>("")
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      setPendingFiles(files)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setPendingFiles(files)
    }
  }

  const handleSendFiles = () => {
    if (pendingFiles && selectedPeer) {
      onFileSelect(pendingFiles, selectedPeer)
      setPendingFiles(null)
      setSelectedPeer("")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const availablePeers = peers.filter((p) => p.user_id !== currentUserId)

  return (
    <Card className="p-8 space-y-6 backdrop-blur-xl border border-border/50 bg-card/40 shadow-2xl rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">File Transfer</h3>
          <p className="text-sm text-muted-foreground">Share files directly with peers in this room</p>
        </div>

        {/* File Selection Area */}
        <label
          className={`block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-accent bg-accent/15 scale-[1.02] shadow-xl"
              : "border-border/50 hover:border-accent/60 hover:bg-accent/8 bg-muted/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" multiple onChange={handleFileSelect} className="hidden" accept="*" />
          <div className="space-y-3">
            <Upload
              className={`w-16 h-16 mx-auto transition-colors ${
                isDragging ? "text-accent" : "text-muted-foreground/50"
              }`}
            />
            <div>
              <p className="font-bold text-foreground text-lg">Drag and drop files here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to select files from your device</p>
            </div>
          </div>
        </label>

        {/* Pending Files - Select Recipient */}
        {pendingFiles && pendingFiles.length > 0 && (
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-muted-foreground mt-1">Choose a recipient to send</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingFiles(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Select value={selectedPeer} onValueChange={setSelectedPeer}>
                <SelectTrigger className="flex-1 bg-background/50">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeers.map((peer) => (
                    <SelectItem key={peer.id} value={peer.user_id}>
                      {peer.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendFiles}
                disabled={!selectedPeer}
                className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        )}

        {/* Transfer List */}
        {transfers.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              Transfers ({transfers.length})
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl p-4 space-y-3 transition-all hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {transfer.direction === "sending" ? (
                        <Upload className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      ) : (
                        <Download className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{transfer.fileName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{formatFileSize(transfer.fileSize)}</p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">
                            {transfer.direction === "sending" ? "To" : "From"} {transfer.peerName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {transfer.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {transfer.status === "failed" && <AlertCircle className="w-5 h-5 text-red-500" />}
                      {transfer.status === "rejected" && <X className="w-5 h-5 text-orange-500" />}
                      {transfer.status === "waiting-for-acceptance" && (
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      )}
                      <p className="text-sm font-bold text-accent min-w-12 text-right">
                        {transfer.status === "waiting-for-acceptance" 
                          ? "Waiting" 
                          : `${Math.round(transfer.progress)}%`}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/40">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        transfer.status === "completed"
                          ? "bg-gradient-to-r from-green-500 to-green-400"
                          : transfer.status === "failed"
                            ? "bg-gradient-to-r from-red-500 to-red-400"
                            : transfer.status === "rejected"
                              ? "bg-gradient-to-r from-orange-500 to-orange-400"
                              : transfer.status === "waiting-for-acceptance"
                                ? "bg-gradient-to-r from-yellow-500 to-yellow-400 animate-pulse"
                                : transfer.direction === "sending"
                                  ? "bg-gradient-to-r from-accent to-primary"
                                  : "bg-gradient-to-r from-primary to-accent"
                      }`}
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
