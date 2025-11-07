const CHUNK_SIZE = 16384 // 16KB chunks
const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024 // 16MB buffer threshold

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

export interface FileTransferAck {
  fileId: string
  accepted: boolean
  reason?: string
}

export class FileTransferManager {
  private pendingTransfers = new Map<
    string,
    {
      metadata: FileMetadata
      writer: WritableStreamDefaultWriter<Uint8Array>
      receivedChunks: number
      totalChunks: number
      chunks: Map<number, ArrayBuffer>
    }
  >()

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

    // Send file chunks
    await this.sendChunks(file, fileId, peerId, sendData, onProgress, getBufferedAmount)
  }

  async sendFileChunks(
    file: File,
    fileId: string,
    peerId: string,
    sendData: (data: any) => void,
    onProgress: (progress: number) => void,
    getBufferedAmount?: () => number,
  ): Promise<void> {
    // Send only file chunks, without metadata (metadata was already sent)
    await this.sendChunks(file, fileId, peerId, sendData, onProgress, getBufferedAmount)
  }

  private async sendChunks(
    file: File,
    fileId: string,
    peerId: string,
    sendData: (data: any) => void,
    onProgress: (progress: number) => void,
    getBufferedAmount?: () => number,
  ): Promise<void> {
    // Read and send file in chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    let sentChunks = 0

    for (let i = 0; i < totalChunks; i++) {
      // Wait if the buffer is too full to prevent memory issues
      if (getBufferedAmount) {
        while (getBufferedAmount() > MAX_BUFFERED_AMOUNT) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const arrayBuffer = await chunk.arrayBuffer()

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
    }

    sendData({
      type: "file-complete",
      fileId,
      peerId,
    })
  }

  receiveMetadata(metadata: FileMetadata, writer: WritableStreamDefaultWriter<Uint8Array>) {
    this.pendingTransfers.set(metadata.id, {
      metadata,
      writer,
      receivedChunks: 0,
      totalChunks: 0,
      chunks: new Map(),
    })
  }

  async receiveChunk(chunk: FileChunk, onProgress: (fileId: string, progress: number) => void) {
    const transfer = this.pendingTransfers.get(chunk.id)
    if (!transfer) return

    // Data is already an ArrayBuffer - no conversion needed
    const arrayBuffer = chunk.data instanceof ArrayBuffer ? chunk.data : new Uint8Array(chunk.data).buffer
    
    // Store total chunks (can be set from any chunk, not just the first one)
    if (transfer.totalChunks === 0 && chunk.total > 0) {
      transfer.totalChunks = chunk.total
    }

    // Write chunk immediately to stream
    try {
      // Store chunk temporarily if not in order
      transfer.chunks.set(chunk.index, arrayBuffer)
      
      // Write all sequential chunks starting from receivedChunks
      while (transfer.chunks.has(transfer.receivedChunks)) {
        const nextChunk = transfer.chunks.get(transfer.receivedChunks)!
        await transfer.writer.write(new Uint8Array(nextChunk))
        transfer.chunks.delete(transfer.receivedChunks)
        transfer.receivedChunks++
      }
    } catch (error) {
      console.error("Error writing chunk to stream:", error)
      throw error
    }

    const progress = (transfer.receivedChunks / chunk.total) * 100
    onProgress(chunk.id, progress)
  }

  async completeTransfer(fileId: string): Promise<void> {
    const transfer = this.pendingTransfers.get(fileId)
    if (!transfer) return

    // Close the writer
    try {
      await transfer.writer.close()
    } catch (error) {
      console.error("Error closing stream writer:", error)
    }
    this.pendingTransfers.delete(fileId)
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
