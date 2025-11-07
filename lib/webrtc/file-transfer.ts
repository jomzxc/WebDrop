const CHUNK_SIZE = 16384 // 16KB chunks
const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024 // 16MB buffer threshold
const BUFFER_CHECK_INTERVAL = 100 // Check every 100ms instead of 10ms to reduce CPU usage
const POST_SEND_DELAY_MS = 10 // Small delay after sending to allow buffer to drain
const MAX_BUFFER_WAIT_TIME = 30000 // Maximum 30 seconds to wait for buffer to drain

export interface FileMetadata {
  name: string
  size: number
  type: string
  id: string
}

export interface FileChunk {
  id: string
  index: number
  data: ArrayBuffer
  total: number
}

export class FileTransferManager {
  private pendingTransfers = new Map<
    string,
    {
      metadata: FileMetadata
      chunks: ArrayBuffer[]
      receivedChunks: number
    }
  >()
  private cancelledTransfers = new Set<string>()

  async sendFile(
    file: File,
    peerId: string,
    sendData: (data: any) => void,
    onProgress: (progress: number) => void,
    getBufferedAmount?: () => number,
  ): Promise<void> {
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const metadata: FileMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
    }

    // Send metadata first
    sendData({
      type: "file-metadata",
      metadata,
      peerId,
    })

    // Read and send file in chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    let sentChunks = 0

    for (let i = 0; i < totalChunks; i++) {
      // Check if transfer was cancelled
      if (this.cancelledTransfers.has(fileId)) {
        this.cancelledTransfers.delete(fileId)
        throw new Error("Transfer cancelled")
      }

      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      
      let arrayBuffer: ArrayBuffer
      try {
        arrayBuffer = await chunk.arrayBuffer()
      } catch (error) {
        throw new Error(`Failed to read file chunk: ${error instanceof Error ? error.message : "Unknown error"}`)
      }

      // Wait if the buffer is too full BEFORE sending
      // This prevents overwhelming the data channel buffer
      if (getBufferedAmount) {
        let bufferedAmount = getBufferedAmount()
        const startWaitTime = Date.now()
        while (bufferedAmount > MAX_BUFFERED_AMOUNT) {
          // Check for timeout to prevent infinite loop
          if (Date.now() - startWaitTime > MAX_BUFFER_WAIT_TIME) {
            throw new Error("Buffer wait timeout: data channel buffer not draining")
          }
          
          // Check if transfer was cancelled
          if (this.cancelledTransfers.has(fileId)) {
            this.cancelledTransfers.delete(fileId)
            throw new Error("Transfer cancelled")
          }
          
          // Use longer interval to avoid tight loop and excessive CPU usage
          await new Promise((resolve) => setTimeout(resolve, BUFFER_CHECK_INTERVAL))
          bufferedAmount = getBufferedAmount()
        }
      }

      // Send ArrayBuffer directly - avoid expensive Array conversion
      sendData({
        type: "file-chunk",
        chunk: {
          id: fileId,
          index: i,
          data: arrayBuffer,
          total: totalChunks,
        },
        peerId,
      })

      sentChunks++
      onProgress((sentChunks / totalChunks) * 100)
      
      // Add a small delay after sending to allow buffer to drain
      // This prevents rapid successive sends from overwhelming the channel
      if (getBufferedAmount && getBufferedAmount() > MAX_BUFFERED_AMOUNT / 2) {
        await new Promise((resolve) => setTimeout(resolve, POST_SEND_DELAY_MS))
      }
    }

    sendData({
      type: "file-complete",
      fileId,
      peerId,
    })
  }

  receiveMetadata(metadata: FileMetadata) {
    this.pendingTransfers.set(metadata.id, {
      metadata,
      chunks: [],
      receivedChunks: 0,
    })
  }

  receiveChunk(chunk: FileChunk, onProgress: (fileId: string, progress: number) => void) {
    const transfer = this.pendingTransfers.get(chunk.id)
    if (!transfer) {
      console.warn(`Received chunk for unknown transfer: ${chunk.id}`)
      return
    }

    // Validate chunk index to prevent out-of-bounds access
    if (chunk.index < 0 || chunk.index >= chunk.total) {
      const errorMsg = `Invalid chunk index ${chunk.index} for transfer ${chunk.id} (expected 0-${chunk.total - 1})`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

    // Data is already an ArrayBuffer - no conversion needed
    const arrayBuffer = chunk.data instanceof ArrayBuffer ? chunk.data : new Uint8Array(chunk.data).buffer
    transfer.chunks[chunk.index] = arrayBuffer
    transfer.receivedChunks++

    const progress = (transfer.receivedChunks / chunk.total) * 100
    onProgress(chunk.id, progress)
  }

  completeTransfer(fileId: string): Blob | null {
    const transfer = this.pendingTransfers.get(fileId)
    if (!transfer) {
      console.warn(`Attempted to complete unknown transfer: ${fileId}`)
      return null
    }

    // Verify all chunks were received to prevent corrupted file
    const expectedChunks = Math.ceil(transfer.metadata.size / CHUNK_SIZE)
    if (transfer.receivedChunks !== expectedChunks) {
      const errorMsg = `Incomplete transfer ${fileId}: received ${transfer.receivedChunks}/${expectedChunks} chunks`
      console.error(errorMsg)
      this.pendingTransfers.delete(fileId)
      throw new Error(errorMsg)
    }

    // Verify no gaps in chunks array
    for (let i = 0; i < expectedChunks; i++) {
      if (!transfer.chunks[i]) {
        const errorMsg = `Corrupted transfer ${fileId}: missing chunk ${i}/${expectedChunks}`
        console.error(errorMsg)
        this.pendingTransfers.delete(fileId)
        throw new Error(errorMsg)
      }
    }

    // Combine all chunks
    const blob = new Blob(transfer.chunks, { type: transfer.metadata.type })
    this.pendingTransfers.delete(fileId)

    return blob
  }

  getMetadata(fileId: string): FileMetadata | undefined {
    return this.pendingTransfers.get(fileId)?.metadata
  }

  cancelTransfer(fileId: string) {
    this.cancelledTransfers.add(fileId)
    this.pendingTransfers.delete(fileId)
  }

  clearPendingTransfers() {
    this.pendingTransfers.clear()
    this.cancelledTransfers.clear()
  }
}
