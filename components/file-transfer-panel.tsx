"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Upload, File, CheckCircle2, AlertCircle } from "lucide-react"

interface FileTransferPanelProps {
  roomId: string
}

interface TransferItem {
  id: string
  fileName: string
  progress: number
  size: string
  status: "uploading" | "completed" | "failed"
}

export default function FileTransferPanel({ roomId }: FileTransferPanelProps) {
  const [transfers, setTransfers] = useState<TransferItem[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const simulateFileUpload = (fileName: string, fileSize: string) => {
    const id = Math.random().toString(36).substring(7)
    const newTransfer: TransferItem = {
      id,
      fileName,
      progress: 0,
      size: fileSize,
      status: "uploading",
    }

    setTransfers((prev) => [...prev, newTransfer])

    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += Math.random() * 30
      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(interval)
        setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, progress: 100, status: "completed" } : t)))
      } else {
        setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, progress: currentProgress } : t)))
      }
    }, 300)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) {
      Array.from(files).forEach((file) => {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
        simulateFileUpload(file.name, `${sizeInMB} MB`)
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files) {
      Array.from(files).forEach((file) => {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
        simulateFileUpload(file.name, `${sizeInMB} MB`)
      })
    }
  }

  return (
    <Card className="p-8 space-y-6 backdrop-blur-xl border border-border/50 bg-card/40 shadow-2xl rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">File Transfer</h3>
          <p className="text-sm text-muted-foreground">Upload files to share with peers in this room</p>
        </div>

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

        {/* Transfer List */}
        {transfers.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              Active Transfers ({transfers.length})
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl p-4 space-y-3 transition-all hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{transfer.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{transfer.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {transfer.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {transfer.status === "failed" && <AlertCircle className="w-5 h-5 text-red-500" />}
                      <p className="text-sm font-bold text-accent min-w-12 text-right">
                        {Math.round(transfer.progress)}%
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
                            : "bg-gradient-to-r from-accent to-primary"
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
