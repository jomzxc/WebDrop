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
  status: "pending" | "waiting-for-acceptance" | "transferring" | "completed" | "failed" | "rejected"
  direction: "sending" | "receiving"
  peerId?: string
  peerName?: string
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export function useFileTransfer(roomId: string) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const transferManager = useRef(new FileTransferManager())
  const fileStreams = useRef(new Map<string, WritableStream<Uint8Array>>())
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
    fileStreams.current.clear()
  }, [])

  const sendFile = useCallback(
    async (file: File, peerId: string, peerName: string, sendData: (data: any) => void, getBufferedAmount?: () => number) => {
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
        status: "waiting-for-acceptance",
        direction: "sending",
        peerId,
        peerName,
      })

      try {
        await transferManager.current.sendFile(file, peerId, sendData, (progress) => {
          updateTransfer(transferId, { progress, status: "transferring" })
        }, getBufferedAmount)

        // Don't mark as completed yet - wait for receiver acknowledgment
        updateTransfer(transferId, { progress: 100, status: "waiting-for-acceptance" })

        toast({
          title: "File sent",
          description: `Waiting for ${peerName} to accept ${file.name}`,
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
            status: "pending",
            completed_at: null,
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
    async (metadata: any, peerName: string, sendAck: (data: any) => void) => {
      if (!metadata?.id || !metadata?.name || !metadata?.size) {
        toast({
          title: "Invalid file metadata",
          description: "Received invalid file information",
          variant: "destructive",
        })
        sendAck({
          type: "file-ack",
          ack: {
            fileId: metadata?.id || "unknown",
            accepted: false,
            reason: "Invalid file metadata",
          },
        })
        return
      }

      if (metadata.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${peerName} tried to send a file larger than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        })
        sendAck({
          type: "file-ack",
          ack: {
            fileId: metadata.id,
            accepted: false,
            reason: "File too large",
          },
        })
        return
      }

      // Check if showSaveFilePicker is available (modern browsers)
      if (typeof window === "undefined" || !("showSaveFilePicker" in window)) {
        toast({
          title: "Browser not supported",
          description: "Your browser doesn't support file streaming. Please use Chrome 86+, Edge 86+, or Safari 15.2+ to receive files.",
          variant: "destructive",
        })
        sendAck({
          type: "file-ack",
          ack: {
            fileId: metadata.id,
            accepted: false,
            reason: "Browser not supported",
          },
        })
        return
      }

      try {
        // Use File System Access API for streaming
        const fileHandle = await (window as Window & typeof globalThis & { showSaveFilePicker: (options?: any) => Promise<any> }).showSaveFilePicker({
          suggestedName: metadata.name,
        })
        const writableStream = await fileHandle.createWritable()
        const writer = writableStream.getWriter()
        
        fileStreams.current.set(metadata.id, writableStream)
        transferManager.current.receiveMetadata(metadata, writer)

        addTransfer({
          id: metadata.id,
          fileName: metadata.name,
          fileSize: metadata.size,
          progress: 0,
          status: "transferring",
          direction: "receiving",
          peerName,
        })

        // Send acknowledgment to sender
        sendAck({
          type: "file-ack",
          ack: {
            fileId: metadata.id,
            accepted: true,
          },
        })

        toast({
          title: "Receiving file",
          description: `${metadata.name} from ${peerName}`,
        })
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // User cancelled the file picker
          toast({
            title: "Transfer cancelled",
            description: "File download was cancelled",
            variant: "destructive",
          })
          sendAck({
            type: "file-ack",
            ack: {
              fileId: metadata.id,
              accepted: false,
              reason: "User cancelled",
            },
          })
        } else {
          console.error("Error setting up file transfer:", error)
          toast({
            title: "Transfer error",
            description: "Failed to set up file transfer",
            variant: "destructive",
          })
          sendAck({
            type: "file-ack",
            ack: {
              fileId: metadata.id,
              accepted: false,
              reason: "Failed to set up file transfer",
            },
          })
        }
      }
    },
    [addTransfer, toast],
  )

  const handleFileChunk = useCallback(
    async (chunk: any) => {
      try {
        await transferManager.current.receiveChunk(chunk, (fileId, progress) => {
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
    async (fileId: string, sendComplete?: (data: any) => void) => {
      try {
        // Get metadata BEFORE completing the transfer (which deletes it)
        const metadata = transferManager.current.getMetadata(fileId)
        
        // Check if the transfer was ever started (if not, user likely cancelled or setup failed)
        if (!metadata) {
          // Transfer was never set up, don't show error (user already saw setup error/cancellation)
          return
        }
        
        await transferManager.current.completeTransfer(fileId)

        // Check if we used streaming mode
        const usedStreaming = fileStreams.current.has(fileId)
        if (usedStreaming) {
          fileStreams.current.delete(fileId)
        }

        if (usedStreaming) {
          // For streaming mode, file is already saved
          updateTransfer(fileId, { progress: 100, status: "completed" })

          toast({
            title: "File received",
            description: `${metadata.name} downloaded successfully`,
          })

          // Send completion ack to sender
          if (sendComplete) {
            sendComplete({
              type: "file-transfer-complete",
              fileId,
            })
          }
        } else {
          // Streaming mode should always be used now
          updateTransfer(fileId, { status: "failed" })
          toast({
            title: "Download failed",
            description: "Failed to complete file transfer.",
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

  const handleFileAck = useCallback(
    (ack: { fileId: string; accepted: boolean; reason?: string }) => {
      if (ack.accepted) {
        updateTransfer(ack.fileId, { status: "transferring" })
        toast({
          title: "Transfer accepted",
          description: "Recipient is downloading the file",
        })
      } else {
        updateTransfer(ack.fileId, { status: "rejected" })
        toast({
          title: "Transfer rejected",
          description: ack.reason || "Recipient rejected the file",
          variant: "destructive",
        })
      }
    },
    [updateTransfer, toast],
  )

  const handleTransferComplete = useCallback(
    (fileId: string) => {
      updateTransfer(fileId, { status: "completed" })
      toast({
        title: "Transfer complete",
        description: "File successfully received by recipient",
      })
    },
    [updateTransfer, toast],
  )

  return {
    transfers,
    sendFile,
    handleFileMetadata,
    handleFileChunk,
    handleFileComplete,
    handleFileAck,
    handleTransferComplete,
    clearTransfers,
  }
}
