/**
 * @jest-environment node
 */

import { FileTransferManager } from '@/lib/webrtc/file-transfer'

function makeFile(size: number, name = 'test.bin', type = 'application/octet-stream') {
  // Avoid relying on jsdom's File implementation (which may not implement Blob#arrayBuffer).
  // Create a Blob and decorate it to look like a File.
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) bytes[i] = i % 251
  const blob = new Blob([bytes], { type })
  return Object.assign(blob, {
    name,
    lastModified: Date.now(),
    // Ensure slice returns a Blob with arrayBuffer().
    slice: blob.slice.bind(blob),
  }) as unknown as File
}

describe('FileTransferManager', () => {
  test('sendFile sends metadata, chunks, and completion; reports progress', async () => {
    const ftm = new FileTransferManager()
    const file = makeFile(50_000) // spans multiple 16KB chunks

    const sent: any[] = []
    const progress: number[] = []

    await ftm.sendFile(
      file,
      'peer-1',
      (data) => sent.push(data),
      (p) => progress.push(p),
    )

    expect(sent[0].type).toBe('file-metadata')
    expect(sent[0].peerId).toBe('peer-1')
    expect(sent[0].metadata.name).toBe('test.bin')
    expect(sent[0].metadata.size).toBe(50_000)

    const chunkMessages = sent.filter((m) => m.type === 'file-chunk')
    expect(chunkMessages.length).toBeGreaterThan(1)
    for (const msg of chunkMessages) {
      expect(msg.chunk).toHaveProperty('id')
      expect(typeof msg.chunk.index).toBe('number')
      expect(msg.chunk.data).toBeInstanceOf(ArrayBuffer)
      expect(typeof msg.chunk.total).toBe('number')
      expect(msg.peerId).toBe('peer-1')
    }

    const complete = sent[sent.length - 1]
    expect(complete.type).toBe('file-complete')
    expect(complete.peerId).toBe('peer-1')
    expect(typeof complete.fileId).toBe('string')

    // progress should monotonically increase and end at 100
    expect(progress.length).toBe(chunkMessages.length)
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1])
    }
    expect(progress[progress.length - 1]).toBe(100)
  })

  test('sendFile waits for bufferedAmount to drain and errors on timeout', async () => {
    const ftm = new FileTransferManager()
    const file = makeFile(20_000)

    const sent: any[] = []
    const progress: number[] = []

    // Never drains
    const getBufferedAmount = () => 99 * 1024 * 1024

    // Avoid fake timers here because the implementation uses Date.now() for timeout.
    // Instead, force the timeout window to elapse by mocking Date.now().
    const nowSpy = jest.spyOn(Date, 'now')
    let calls = 0
    nowSpy.mockImplementation(() => {
      calls++
      // sendFile uses Date.now() for fileId generation BEFORE it starts waiting.
      // Ensure both the fileId generation call and startWaitTime call are 0.
      if (calls <= 2) return 0
      // After that, pretend enough time has elapsed to trigger the timeout branch.
      return 31_000
    })

    await expect(
      ftm.sendFile(file, 'peer-1', (d) => sent.push(d), (p) => progress.push(p), getBufferedAmount),
    ).rejects.toThrow(/Buffer wait timeout/i)

    nowSpy.mockRestore()
  })

  test('sendFile can be cancelled mid-transfer', async () => {
    jest.useFakeTimers()
    const ftm = new FileTransferManager()
    const file = makeFile(80_000)

    const sent: any[] = []
    const progress: number[] = []

    let firstChunkId: string | null = null

    const sendData = (d: any) => {
      sent.push(d)
      if (d.type === 'file-metadata') {
        firstChunkId = d.metadata.id
      }
      // Cancel after first chunk is emitted
      if (d.type === 'file-chunk' && firstChunkId) {
        ftm.cancelTransfer(firstChunkId)
      }
    }

    const promise = ftm.sendFile(file, 'peer-1', sendData, (p) => progress.push(p))

    // Allow microtasks to progress
    await Promise.resolve()

    await expect(promise).rejects.toThrow(/Transfer cancelled/i)
    jest.useRealTimers()
  })

  test('receiveChunk validates indices and reports progress; completeTransfer builds Blob', () => {
    const ftm = new FileTransferManager()

    // size must match expectedChunks = ceil(size/16384) used by completeTransfer.
    const metadata = { id: 'f1', name: 'a.txt', size: 16384 * 2, type: 'text/plain' }
    ftm.receiveMetadata(metadata)

    const p: Array<{ id: string; progress: number }> = []

    const buf1 = new TextEncoder().encode('hello').buffer
    const buf2 = new TextEncoder().encode('world').buffer

    ftm.receiveChunk({ id: 'f1', index: 0, data: buf1, total: 2 }, (id, progress) => p.push({ id, progress }))
    ftm.receiveChunk({ id: 'f1', index: 1, data: buf2, total: 2 }, (id, progress) => p.push({ id, progress }))

    expect(p[0].id).toBe('f1')
    expect(p[0].progress).toBe(50)
    expect(p[1].progress).toBe(100)

    const blob = ftm.completeTransfer('f1')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob?.type).toBe('text/plain')
  })

  test('receiveChunk throws on invalid index', () => {
    const ftm = new FileTransferManager()
    ftm.receiveMetadata({ id: 'f2', name: 'x', size: 1, type: 'application/octet-stream' })

    expect(() =>
      ftm.receiveChunk({ id: 'f2', index: -1, data: new ArrayBuffer(1), total: 1 }, () => {}),
    ).toThrow(/Invalid chunk index/i)
  })

  test('completeTransfer throws on incomplete transfers', () => {
    const ftm = new FileTransferManager()
    ftm.receiveMetadata({ id: 'f3', name: 'x', size: 40_000, type: 'application/octet-stream' })

    // no chunks received
    expect(() => ftm.completeTransfer('f3')).toThrow(/Incomplete transfer/i)
  })
})
