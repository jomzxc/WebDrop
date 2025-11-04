"use client"

import { useState, useCallback, useRef } from "react"
import { FileTransferManager } from "@/lib/webrtc/file-transfer"
import { createClient } from "@/lib/supabase/client"

export interface Transfer {
  id: string
  fileName: string
  fileSize: number
  progress: number
  status: "pending" | "transferring" | "completed" | "failed"
  direction: "sending" | "receiving"
  peerId?: string
  peerName?: string
}

export function useFileTransfer(roomId: string) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const transferManager = useRef(new FileTransferManager())
  const supabase = createClient()

  const addTransfer = useCallback((transfer: Transfer) => {
    setTransfers((prev) => [...prev, transfer])
  }, [])

  const updateTransfer = useCallback((id: string, updates: Partial<Transfer>) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const sendFile = useCallback(
    async (file: File, peerId: string, peerName: string, sendData: (data: any) => void) => {
      const transferId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

      addTransfer({
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: "transferring",
        direction: "sending",
        peerId,
        peerName,
      })

      try {
        await transferManager.current.sendFile(file, peerId, sendData, (progress) => {
          updateTransfer(transferId, { progress })
        })

        updateTransfer(transferId, { progress: 100, status: "completed" })

        // Log to database
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await supabase.from("file_transfers").insert({
            room_id: roomId,
            sender_id: user.id,
            receiver_id: peerId,
            file_name: file.name,
            file_size: file.size,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error("[v0] File transfer error:", error)
        updateTransfer(transferId, { status: "failed" })
      }
    },
    [addTransfer, updateTransfer, roomId, supabase],
  )

  const handleFileMetadata = useCallback(
    (metadata: any, peerName: string) => {
      transferManager.current.receiveMetadata(metadata)

      addTransfer({
        id: metadata.id,
        fileName: metadata.name,
        fileSize: metadata.size,
        progress: 0,
        status: "transferring",
        direction: "receiving",
        peerName,
      })
    },
    [addTransfer],
  )

  const handleFileChunk = useCallback(
    (chunk: any) => {
      transferManager.current.receiveChunk(chunk, (fileId, progress) => {
        updateTransfer(fileId, { progress })
      })
    },
    [updateTransfer],
  )

  const handleFileComplete = useCallback(
    (fileId: string) => {
      const blob = transferManager.current.completeTransfer(fileId)
      const metadata = transferManager.current.getMetadata(fileId)

      if (blob && metadata) {
        // Trigger download
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = metadata.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        updateTransfer(fileId, { progress: 100, status: "completed" })
      }
    },
    [updateTransfer],
  )

  return {
    transfers,
    sendFile,
    handleFileMetadata,
    handleFileChunk,
    handleFileComplete,
  }
}
