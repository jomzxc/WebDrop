import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileTransferManager, type FileMetadata, type FileChunk } from '@/lib/webrtc/file-transfer'

describe('FileTransferManager', () => {
  let manager: FileTransferManager

  beforeEach(() => {
    manager = new FileTransferManager()
  })

  describe('sendFile', () => {
    it('should send file metadata and chunks', async () => {
      const sendData = vi.fn()
      const onProgress = vi.fn()
      const fileContent = 'Hello, World!'
      const blob = new Blob([fileContent], { type: 'text/plain' })
      const file = new File([blob], 'test.txt', { type: 'text/plain' })

      await manager.sendFile(file, 'peer123', sendData, onProgress)

      // Should send metadata first
      expect(sendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file-metadata',
          metadata: expect.objectContaining({
            name: 'test.txt',
            size: fileContent.length,
            type: 'text/plain',
          }),
          peerId: 'peer123',
        })
      )

      // Should send chunks
      expect(sendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file-chunk',
          peerId: 'peer123',
        })
      )

      // Should send completion message
      expect(sendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file-complete',
          peerId: 'peer123',
        })
      )

      // Should report progress
      expect(onProgress).toHaveBeenCalled()
      expect(onProgress).toHaveBeenLastCalledWith(100)
    })

    it('should handle large files with multiple chunks', async () => {
      const sendData = vi.fn()
      const onProgress = vi.fn()
      // Create a file larger than chunk size (16KB)
      const largeContent = 'x'.repeat(20000)
      const blob = new Blob([largeContent], { type: 'text/plain' })
      const file = new File([blob], 'large.txt', { type: 'text/plain' })

      await manager.sendFile(file, 'peer123', sendData, onProgress)

      // Count chunk messages
      const chunkCalls = sendData.mock.calls.filter(
        call => call[0].type === 'file-chunk'
      )
      expect(chunkCalls.length).toBeGreaterThan(1)

      // Progress should be called multiple times
      expect(onProgress.mock.calls.length).toBeGreaterThan(1)
    })
  })

  describe('receiveMetadata', () => {
    it('should store metadata for incoming transfer', () => {
      const metadata: FileMetadata = {
        id: 'file123',
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
      }

      manager.receiveMetadata(metadata)

      expect(manager.getMetadata('file123')).toEqual(metadata)
    })
  })

  describe('receiveChunk', () => {
    it('should accumulate chunks and report progress', () => {
      const metadata: FileMetadata = {
        id: 'file123',
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
      }
      manager.receiveMetadata(metadata)

      const onProgress = vi.fn()
      const chunk: FileChunk = {
        id: 'file123',
        index: 0,
        data: new Uint8Array([72, 101, 108, 108, 111]).buffer,
        total: 2,
      }

      manager.receiveChunk(chunk, onProgress)

      expect(onProgress).toHaveBeenCalledWith('file123', 50)
    })

    it('should handle chunk without metadata gracefully', () => {
      const onProgress = vi.fn()
      const chunk: FileChunk = {
        id: 'nonexistent',
        index: 0,
        data: new ArrayBuffer(10),
        total: 1,
      }

      expect(() => {
        manager.receiveChunk(chunk, onProgress)
      }).not.toThrow()

      expect(onProgress).not.toHaveBeenCalled()
    })
  })

  describe('completeTransfer', () => {
    it('should combine chunks and return a blob', () => {
      const metadata: FileMetadata = {
        id: 'file123',
        name: 'test.txt',
        size: 10,
        type: 'text/plain',
      }
      manager.receiveMetadata(metadata)

      const chunk1: FileChunk = {
        id: 'file123',
        index: 0,
        data: new Uint8Array([72, 101, 108, 108, 111]).buffer,
        total: 2,
      }
      const chunk2: FileChunk = {
        id: 'file123',
        index: 1,
        data: new Uint8Array([32, 87, 111, 114, 108, 100]).buffer,
        total: 2,
      }

      manager.receiveChunk(chunk1, vi.fn())
      manager.receiveChunk(chunk2, vi.fn())

      const blob = manager.completeTransfer('file123')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob?.type).toBe('text/plain')
      expect(blob?.size).toBeGreaterThan(0)

      // Should clean up after completion
      expect(manager.getMetadata('file123')).toBeUndefined()
    })

    it('should return null for nonexistent transfer', () => {
      const blob = manager.completeTransfer('nonexistent')
      expect(blob).toBeNull()
    })
  })

  describe('cancelTransfer', () => {
    it('should remove pending transfer', () => {
      const metadata: FileMetadata = {
        id: 'file123',
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
      }
      manager.receiveMetadata(metadata)

      expect(manager.getMetadata('file123')).toBeDefined()

      manager.cancelTransfer('file123')

      expect(manager.getMetadata('file123')).toBeUndefined()
    })
  })

  describe('clearPendingTransfers', () => {
    it('should clear all pending transfers', () => {
      const metadata1: FileMetadata = {
        id: 'file1',
        name: 'test1.txt',
        size: 100,
        type: 'text/plain',
      }
      const metadata2: FileMetadata = {
        id: 'file2',
        name: 'test2.txt',
        size: 200,
        type: 'text/plain',
      }

      manager.receiveMetadata(metadata1)
      manager.receiveMetadata(metadata2)

      expect(manager.getMetadata('file1')).toBeDefined()
      expect(manager.getMetadata('file2')).toBeDefined()

      manager.clearPendingTransfers()

      expect(manager.getMetadata('file1')).toBeUndefined()
      expect(manager.getMetadata('file2')).toBeUndefined()
    })
  })
})
