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

    console.log(`[sendChunks] Starting to send ${totalChunks} chunks for file ${fileId}`)

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
      
      if (i % 50 === 0 || i === totalChunks - 1) {
        console.log(`[sendChunks] Sent chunk ${i}/${totalChunks} for file ${fileId}`)
      }
    }

    console.log(`[sendChunks] All ${sentChunks} chunks sent for file ${fileId}`)

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
      console.log(`[receiveChunk] Total chunks set to ${chunk.total} for file ${chunk.id}`)
    }

    // Write chunk immediately to stream
    try {
      // Store chunk temporarily if not in order
      transfer.chunks.set(chunk.index, arrayBuffer)
      
      // Write all sequential chunks starting from receivedChunks
      await this.writeSequentialChunks(transfer)
    } catch (error) {
      console.error("Error writing chunk to stream:", error)
      throw error
    }

    // Calculate progress using transfer.totalChunks for consistency, cap at 100%
    const progress = transfer.totalChunks > 0 
      ? Math.min((transfer.receivedChunks / transfer.totalChunks) * 100, 100)
      : 0
    
    if (chunk.index % 10 === 0 || transfer.receivedChunks === transfer.totalChunks) {
      console.log(`[receiveChunk] Progress: ${progress.toFixed(1)}% (${transfer.receivedChunks}/${transfer.totalChunks} chunks) for file ${chunk.id}`)
    }
    
    onProgress(chunk.id, progress)
  }

  private async writeSequentialChunks(transfer: {
    metadata: FileMetadata
    writer: WritableStreamDefaultWriter<Uint8Array>
    receivedChunks: number
    totalChunks: number
    chunks: Map<number, ArrayBuffer>
  }): Promise<void> {
    // Write all sequential chunks starting from receivedChunks
    while (transfer.chunks.has(transfer.receivedChunks)) {
      const nextChunk = transfer.chunks.get(transfer.receivedChunks)!
      await transfer.writer.write(new Uint8Array(nextChunk))
      transfer.chunks.delete(transfer.receivedChunks)
      transfer.receivedChunks++
    }
  }

  async completeTransfer(fileId: string): Promise<void> {
    const transfer = this.pendingTransfers.get(fileId)
    if (!transfer) return

    console.log(`[completeTransfer] Starting for file ${fileId}. Received: ${transfer.receivedChunks}, Total: ${transfer.totalChunks}, Buffered: ${transfer.chunks.size}`)

    // Wait for all chunks to be written before closing
    // This handles the case where file-complete arrives before all chunks are processed
    const maxWaitTime = 30000 // 30 seconds max wait per check
    
    // Wait for all expected chunks to arrive
    let startTime = Date.now()
    let waitTime = 50 // Start with 50ms, will increase exponentially
    
    while (transfer.receivedChunks < transfer.totalChunks) {
      if (Date.now() - startTime > maxWaitTime) {
        console.error(`Timeout waiting for chunks. Received ${transfer.receivedChunks}/${transfer.totalChunks}`)
        // Log which chunks are missing (causing the gap)
        const missingChunks: number[] = []
        for (let i = transfer.receivedChunks; i < transfer.totalChunks; i++) {
          if (!transfer.chunks.has(i)) {
            missingChunks.push(i)
          }
        }
        console.error(`Missing chunk indices that are blocking progress: ${missingChunks.slice(0, 20).join(', ')}${missingChunks.length > 20 ? '...' : ''}`)
        break
      }
      // Exponential backoff to reduce CPU usage
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      waitTime = Math.min(waitTime * 1.5, 500) // Max 500ms between checks
    }

    console.log(`[completeTransfer] All chunks received. Received: ${transfer.receivedChunks}, Total: ${transfer.totalChunks}`)

    // Process any remaining buffered chunks that arrived out of order
    // This handles chunks that were buffered but couldn't be written yet
    try {
      const chunksBeforeWrite = transfer.chunks.size
      await this.writeSequentialChunks(transfer)
      const chunksWritten = chunksBeforeWrite - transfer.chunks.size
      if (chunksWritten > 0) {
        console.log(`[completeTransfer] Wrote ${chunksWritten} buffered chunks`)
      }
    } catch (error) {
      console.error("Error writing buffered chunks:", error)
    }

    // Wait for any remaining buffered chunks to be written (separate timeout)
    // This should now be 0 since we processed them above, but keep as safety check
    startTime = Date.now()
    waitTime = 50
    
    while (transfer.chunks.size > 0) {
      if (Date.now() - startTime > maxWaitTime) {
        console.error(`Timeout waiting for buffered chunks. Remaining: ${transfer.chunks.size}`)
        // Log which chunks are stuck
        const stuckChunks = Array.from(transfer.chunks.keys()).sort((a, b) => a - b)
        console.error(`Stuck chunk indices: ${stuckChunks.join(', ')}`)
        console.error(`Expected next chunk index: ${transfer.receivedChunks}`)
        
        // Determine which chunks are missing that would unblock these stuck chunks
        const missingThatBlockStuck: number[] = []
        for (let i = 0; i < Math.min(...stuckChunks); i++) {
          if (!transfer.chunks.has(i) && i >= transfer.receivedChunks) {
            missingThatBlockStuck.push(i)
          }
        }
        if (missingThatBlockStuck.length > 0) {
          console.error(`Missing chunks blocking stuck chunks: ${missingThatBlockStuck.join(', ')}`)
        }
        break
      }
      // Exponential backoff to reduce CPU usage
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      waitTime = Math.min(waitTime * 1.5, 500) // Max 500ms between checks
    }

    console.log(`[completeTransfer] All buffered chunks written. Buffered: ${transfer.chunks.size}`)

    // If we still have buffered chunks after timeout, identify missing chunks
    if (transfer.chunks.size > 0) {
      const stuckChunks = Array.from(transfer.chunks.keys()).sort((a, b) => a - b)
      const allChunksReceived = new Set<number>()
      
      // Track which chunks we have
      for (let i = 0; i < transfer.receivedChunks; i++) {
        allChunksReceived.add(i)
      }
      stuckChunks.forEach(idx => allChunksReceived.add(idx))
      
      // Find missing chunks
      const missingChunks: number[] = []
      for (let i = 0; i < transfer.totalChunks; i++) {
        if (!allChunksReceived.has(i)) {
          missingChunks.push(i)
        }
      }
      
      console.error(`[completeTransfer] WARNING: Closing file with ${transfer.chunks.size} chunks not written. File will be corrupted.`)
      console.error(`Written chunks: ${transfer.receivedChunks}/${transfer.totalChunks}`)
      console.error(`Missing ${missingChunks.length} chunks: ${missingChunks.slice(0, 30).join(', ')}${missingChunks.length > 30 ? '...' : ''}`)
      console.error(`These missing chunks prevent ${transfer.chunks.size} buffered chunks from being written.`)
    }

    // Close the writer - this should flush all data to disk
    try {
      console.log(`[completeTransfer] Closing writer for file ${fileId}`)
      await transfer.writer.close()
      console.log(`[completeTransfer] Writer closed successfully for file ${fileId}`)
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
