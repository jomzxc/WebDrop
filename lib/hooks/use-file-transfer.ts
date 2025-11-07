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
        status: "transferring",
        direction: "sending",
        peerId,
        peerName,
      })

      try {
        await transferManager.current.sendFile(file, peerId, sendData, (progress) => {
          updateTransfer(transferId, { progress })
        }, getBufferedAmount)

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
    async (metadata: any, peerName: string) => {
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

      try {
        // Check if showSaveFilePicker is available (modern browsers)
        if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
          // Use File System Access API for streaming
          const fileHandle = await (window as Window & typeof globalThis & { showSaveFilePicker: (options?: any) => Promise<any> }).showSaveFilePicker({
            suggestedName: metadata.name,
            types: [
              {
                description: "Files",
                accept: { "*/*": [] },
              },
            ],
          })
          const writableStream = await fileHandle.createWritable()
          const writer = writableStream.getWriter()
          
          fileStreams.current.set(metadata.id, writableStream)
          transferManager.current.receiveMetadata(metadata, writer)
        } else {
          // Fallback to buffering mode for browsers without File System Access API
          transferManager.current.receiveMetadata(metadata, null)
        }

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
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // User cancelled the file picker
          toast({
            title: "Transfer cancelled",
            description: "File download was cancelled",
            variant: "destructive",
          })
        } else {
          console.error("Error setting up file transfer:", error)
          // Fallback to buffering mode
          transferManager.current.receiveMetadata(metadata, null)
          
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
    async (fileId: string) => {
      try {
        // Get metadata BEFORE completing the transfer (which deletes it)
        const metadata = transferManager.current.getMetadata(fileId)
        const blob = await transferManager.current.completeTransfer(fileId)

        // Check if we used streaming mode
        const usedStreaming = fileStreams.current.has(fileId)
        if (usedStreaming) {
          fileStreams.current.delete(fileId)
        }

        if (usedStreaming || (blob && metadata)) {
          // For streaming mode, file is already saved
          // For buffering mode, trigger download
          if (blob && metadata) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = metadata.name
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }

          updateTransfer(fileId, { progress: 100, status: "completed" })

          toast({
            title: "File received",
            description: metadata ? `${metadata.name} downloaded successfully` : "File downloaded successfully",
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
