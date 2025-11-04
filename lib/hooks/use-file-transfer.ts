"use client"

import { useState, useCallback, useRef } from "react"
import { FileTransferManager } from "@/lib/webrtc/file-transfer"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

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

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

export function useFileTransfer(roomId: string) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const transferManager = useRef(new FileTransferManager())
  const supabase = createClient()
  const { toast } = useToast()

  const addTransfer = useCallback((transfer: Transfer) => {
    setTransfers((prev) => [...prev, transfer])
  }, [])

  const updateTransfer = useCallback((id: string, updates: Partial<Transfer>) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const clearTransfers = useCallback(() => {
    setTransfers([])
    transferManager.current.clearPendingTransfers()
  }, [])

  const sendFile = useCallback(
    async (file: File, peerId: string, peerName: string, sendData: (data: any) => void) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        })
        return
      }

      if (!file.name || file.name.length > 255) {
        toast({
          title: "Invalid file name",
          description: "File name must be between 1 and 255 characters",
          variant: "destructive",
        })
        return
      }

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

        toast({
          title: "File sent",
          description: `${file.name} sent to ${peerName}`,
        })

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
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        updateTransfer(transferId, { status: "failed" })
        toast({
          title: "Transfer failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    },
    [addTransfer, updateTransfer, roomId, supabase, toast],
  )

  const handleFileMetadata = useCallback(
    (metadata: any, peerName: string) => {
      if (!metadata?.id || !metadata?.name || !metadata?.size) {
        toast({
          title: "Invalid file metadata",
          description: "Received invalid file information",
          variant: "destructive",
        })
        return
      }

      if (metadata.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${peerName} tried to send a file larger than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        })
        return
      }

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

      toast({
        title: "Receiving file",
        description: `${metadata.name} from ${peerName}`,
      })
    },
    [addTransfer, toast],
  )

  const handleFileChunk = useCallback(
    (chunk: any) => {
      try {
        transferManager.current.receiveChunk(chunk, (fileId, progress) => {
          updateTransfer(fileId, { progress })
        })
      } catch (error) {
        toast({
          title: "Transfer error",
          description: "Failed to receive file chunk",
          variant: "destructive",
        })
      }
    },
    [updateTransfer, toast],
  )

  const handleFileComplete = useCallback(
    (fileId: string) => {
      try {
        // Get metadata BEFORE completing the transfer (which deletes it)
        const metadata = transferManager.current.getMetadata(fileId)
        const blob = transferManager.current.completeTransfer(fileId)

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

          toast({
            title: "File received",
            description: `${metadata.name} downloaded successfully`,
          })
        } else {
          // Add a fallback in case metadata was somehow missing
          updateTransfer(fileId, { status: "failed" })
          toast({
            title: "Download failed",
            description: "Failed to assemble received file.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Download failed",
          description: "Failed to save received file",
          variant: "destructive",
        })
      }
    },
    [updateTransfer, toast],
  )

  return {
    transfers,
    sendFile,
    handleFileMetadata,
    handleFileChunk,
    handleFileComplete,
    clearTransfers,
  }
}
