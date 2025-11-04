const CHUNK_SIZE = 16384 // 16KB chunks

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

  async sendFile(
    file: File,
    peerId: string,
    sendData: (data: any) => void,
    onProgress: (progress: number) => void,
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
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const arrayBuffer = await chunk.arrayBuffer()

      sendData({
        type: "file-chunk",
        chunk: {
          id: fileId,
          index: i,
          data: Array.from(new Uint8Array(arrayBuffer)),
          total: totalChunks,
        },
        peerId,
      })

      sentChunks++
      onProgress((sentChunks / totalChunks) * 100)

      // Small delay to prevent overwhelming the connection
      await new Promise((resolve) => setTimeout(resolve, 10))
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
    if (!transfer) return

    // Convert array back to ArrayBuffer
    const arrayBuffer = new Uint8Array(chunk.data).buffer
    transfer.chunks[chunk.index] = arrayBuffer
    transfer.receivedChunks++

    const progress = (transfer.receivedChunks / chunk.total) * 100
    onProgress(chunk.id, progress)
  }

  completeTransfer(fileId: string): Blob | null {
    const transfer = this.pendingTransfers.get(fileId)
    if (!transfer) return null

    // Combine all chunks
    const blob = new Blob(transfer.chunks, { type: transfer.metadata.type })
    this.pendingTransfers.delete(fileId)

    return blob
  }

  getMetadata(fileId: string): FileMetadata | undefined {
    return this.pendingTransfers.get(fileId)?.metadata
  }

  cancelTransfer(fileId: string) {
    this.pendingTransfers.delete(fileId)
  }

  clearPendingTransfers() {
    this.pendingTransfers.clear()
  }
}
