import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileTransferManager, FileMetadata, FileChunk } from '@/lib/webrtc/file-transfer'

describe('FileTransferManager', () => {
  let manager: FileTransferManager

  beforeEach(() => {
    manager = new FileTransferManager()
  })

  describe('receiveMetadata', () => {
    it('should store file metadata for pending transfer', () => {
      const metadata: FileMetadata = {
        id: 'test-file-123',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain'
      }

      manager.receiveMetadata(metadata)
      
      const storedMetadata = manager.getMetadata('test-file-123')
      expect(storedMetadata).toEqual(metadata)
    })

    it('should initialize empty chunks array', () => {
      const metadata: FileMetadata = {
        id: 'test-file-456',
        name: 'document.pdf',
        size: 2048,
        type: 'application/pdf'
      }

      manager.receiveMetadata(metadata)
      
      // Should be able to receive chunks after metadata
      const storedMetadata = manager.getMetadata('test-file-456')
      expect(storedMetadata).toBeDefined()
    })
  })

  describe('receiveChunk', () => {
    it('should store received chunk in correct position', () => {
      const metadata: FileMetadata = {
        id: 'chunked-file',
        name: 'large.bin',
        size: 32768,
        type: 'application/octet-stream'
      }

      manager.receiveMetadata(metadata)

      const mockProgress = vi.fn()
      const chunk: FileChunk = {
        id: 'chunked-file',
        index: 0,
        data: new Uint8Array([1, 2, 3, 4]).buffer,
        total: 2
      }

      manager.receiveChunk(chunk, mockProgress)

      expect(mockProgress).toHaveBeenCalledWith('chunked-file', 50) // 1/2 = 50%
    })

    it('should calculate progress correctly for multiple chunks', () => {
      const metadata: FileMetadata = {
        id: 'multi-chunk',
        name: 'multi.dat',
        size: 49152,
        type: 'application/octet-stream'
      }

      manager.receiveMetadata(metadata)

      const mockProgress = vi.fn()
      
      // Receive 3 chunks out of 4
      for (let i = 0; i < 3; i++) {
        const chunk: FileChunk = {
          id: 'multi-chunk',
          index: i,
          data: new Uint8Array([i, i+1, i+2]).buffer,
          total: 4
        }
        manager.receiveChunk(chunk, mockProgress)
      }

      // Progress should be called 3 times: 25%, 50%, 75%
      expect(mockProgress).toHaveBeenCalledTimes(3)
      expect(mockProgress).toHaveBeenNthCalledWith(1, 'multi-chunk', 25)
      expect(mockProgress).toHaveBeenNthCalledWith(2, 'multi-chunk', 50)
      expect(mockProgress).toHaveBeenNthCalledWith(3, 'multi-chunk', 75)
    })

    it('should handle chunks received out of order', () => {
      const metadata: FileMetadata = {
        id: 'unordered',
        name: 'unordered.bin',
        size: 16384,
        type: 'application/octet-stream'
      }

      manager.receiveMetadata(metadata)

      const mockProgress = vi.fn()
      
      // Receive chunks in wrong order: 1, 0, 2
      const chunks = [
        { id: 'unordered', index: 1, data: new Uint8Array([2]).buffer, total: 3 },
        { id: 'unordered', index: 0, data: new Uint8Array([1]).buffer, total: 3 },
        { id: 'unordered', index: 2, data: new Uint8Array([3]).buffer, total: 3 },
      ]

      chunks.forEach(chunk => manager.receiveChunk(chunk, mockProgress))

      // Should still track progress correctly
      expect(mockProgress).toHaveBeenCalledTimes(3)
    })

    it('should ignore chunks for unknown file IDs', () => {
      const mockProgress = vi.fn()
      const chunk: FileChunk = {
        id: 'unknown-file',
        index: 0,
        data: new Uint8Array([1, 2, 3]).buffer,
        total: 1
      }

      // Should not throw error
      manager.receiveChunk(chunk, mockProgress)
      
      // Progress should not be called
      expect(mockProgress).not.toHaveBeenCalled()
    })
  })

  describe('completeTransfer', () => {
    it('should combine chunks into a Blob', () => {
      const metadata: FileMetadata = {
        id: 'complete-test',
        name: 'complete.txt',
        size: 15,
        type: 'text/plain'
      }

      manager.receiveMetadata(metadata)

      const mockProgress = vi.fn()
      
      // Receive two chunks
      const chunks = [
        { id: 'complete-test', index: 0, data: new Uint8Array([72, 101, 108, 108, 111]).buffer, total: 2 }, // "Hello"
        { id: 'complete-test', index: 1, data: new Uint8Array([32, 87, 111, 114, 108, 100]).buffer, total: 2 }, // " World"
      ]

      chunks.forEach(chunk => manager.receiveChunk(chunk, mockProgress))

      const blob = manager.completeTransfer('complete-test')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob?.type).toBe('text/plain')
      expect(blob?.size).toBeGreaterThan(0)
    })

    it('should return null for unknown file ID', () => {
      const blob = manager.completeTransfer('non-existent')
      expect(blob).toBeNull()
    })

    it('should remove transfer from pending after completion', () => {
      const metadata: FileMetadata = {
        id: 'cleanup-test',
        name: 'cleanup.bin',
        size: 100,
        type: 'application/octet-stream'
      }

      manager.receiveMetadata(metadata)
      
      const blob = manager.completeTransfer('cleanup-test')
      expect(blob).toBeInstanceOf(Blob)

      // Metadata should be removed after completion
      const removedMetadata = manager.getMetadata('cleanup-test')
      expect(removedMetadata).toBeUndefined()
    })
  })

  describe('getMetadata', () => {
    it('should return undefined for unknown file ID', () => {
      const metadata = manager.getMetadata('non-existent')
      expect(metadata).toBeUndefined()
    })

    it('should return correct metadata for pending transfer', () => {
      const metadata: FileMetadata = {
        id: 'get-test',
        name: 'get.txt',
        size: 512,
        type: 'text/plain'
      }

      manager.receiveMetadata(metadata)
      
      const retrieved = manager.getMetadata('get-test')
      expect(retrieved).toEqual(metadata)
    })
  })

  describe('cancelTransfer', () => {
    it('should remove pending transfer', () => {
      const metadata: FileMetadata = {
        id: 'cancel-test',
        name: 'cancel.txt',
        size: 256,
        type: 'text/plain'
      }

      manager.receiveMetadata(metadata)
      expect(manager.getMetadata('cancel-test')).toBeDefined()

      manager.cancelTransfer('cancel-test')
      expect(manager.getMetadata('cancel-test')).toBeUndefined()
    })

    it('should not throw error for unknown file ID', () => {
      expect(() => manager.cancelTransfer('unknown')).not.toThrow()
    })
  })

  describe('clearPendingTransfers', () => {
    it('should remove all pending transfers', () => {
      const metadata1: FileMetadata = {
        id: 'clear-1',
        name: 'file1.txt',
        size: 100,
        type: 'text/plain'
      }
      const metadata2: FileMetadata = {
        id: 'clear-2',
        name: 'file2.txt',
        size: 200,
        type: 'text/plain'
      }

      manager.receiveMetadata(metadata1)
      manager.receiveMetadata(metadata2)

      expect(manager.getMetadata('clear-1')).toBeDefined()
      expect(manager.getMetadata('clear-2')).toBeDefined()

      manager.clearPendingTransfers()

      expect(manager.getMetadata('clear-1')).toBeUndefined()
      expect(manager.getMetadata('clear-2')).toBeUndefined()
    })
  })

  describe('sendFile', () => {
    it('should send file metadata and chunks', async () => {
      const sendDataMock = vi.fn()
      const onProgressMock = vi.fn()

      // Create a small test file
      const fileContent = 'Hello, World!'
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' })

      await manager.sendFile(file, 'peer-123', sendDataMock, onProgressMock)

      // Should have called sendData with metadata
      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file-metadata',
          metadata: expect.objectContaining({
            name: 'test.txt',
            size: file.size,
            type: 'text/plain',
            id: expect.any(String)
          }),
          peerId: 'peer-123'
        })
      )

      // Should have called sendData with chunks
      const chunkCalls = sendDataMock.mock.calls.filter(
        call => call[0].type === 'file-chunk'
      )
      expect(chunkCalls.length).toBeGreaterThan(0)

      // Should have called sendData with file-complete
      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file-complete',
          fileId: expect.any(String),
          peerId: 'peer-123'
        })
      )

      // Progress should have been reported
      expect(onProgressMock).toHaveBeenCalled()
      expect(onProgressMock).toHaveBeenLastCalledWith(100)
    })

    it('should handle empty file', async () => {
      const sendDataMock = vi.fn()
      const onProgressMock = vi.fn()

      const file = new File([], 'empty.txt', { type: 'text/plain' })

      await manager.sendFile(file, 'peer-456', sendDataMock, onProgressMock)

      // Should still send metadata and complete
      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'file-metadata' })
      )
      expect(sendDataMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'file-complete' })
      )
    })

    it('should chunk large files appropriately', async () => {
      const sendDataMock = vi.fn()
      const onProgressMock = vi.fn()

      // Create a file larger than CHUNK_SIZE (16KB)
      const largeContent = new Uint8Array(32768) // 32KB
      const file = new File([largeContent], 'large.bin', { type: 'application/octet-stream' })

      await manager.sendFile(file, 'peer-789', sendDataMock, onProgressMock)

      // Should have sent multiple chunks
      const chunkCalls = sendDataMock.mock.calls.filter(
        call => call[0].type === 'file-chunk'
      )
      expect(chunkCalls.length).toBeGreaterThan(1)

      // Verify all chunks have sequential indices
      const indices = chunkCalls.map(call => call[0].chunk.index)
      indices.forEach((index, i) => {
        expect(index).toBe(i)
      })
    })
  })
})
