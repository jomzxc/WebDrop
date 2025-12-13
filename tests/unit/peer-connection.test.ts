import { PeerConnection } from '@/lib/webrtc/peer-connection'

class FakeRTCDataChannel {
  readyState: RTCDataChannelState = 'open'
  bufferedAmount = 0
  sent: any[] = []

  onopen: ((ev?: any) => any) | null = null
  onmessage: ((ev: any) => any) | null = null
  onerror: ((ev?: any) => any) | null = null
  onclose: ((ev?: any) => any) | null = null

  send(data: any) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 'closed'
    this.onclose?.({})
  }
}

class FakeRTCPeerConnection {
  connectionState: RTCPeerConnectionState = 'connected'
  iceConnectionState: RTCIceConnectionState = 'connected'
  remoteDescription: RTCSessionDescription | null = null

  onicecandidate: ((ev: any) => any) | null = null
  onconnectionstatechange: ((ev?: any) => any) | null = null
  oniceconnectionstatechange: ((ev?: any) => any) | null = null
  ondatachannel: ((ev: any) => any) | null = null

  private channel = new FakeRTCDataChannel()

  createOffer = jest.fn(async () => ({ type: 'offer', sdp: 'fake' } as any))
  createAnswer = jest.fn(async () => ({ type: 'answer', sdp: 'fake' } as any))
  setLocalDescription = jest.fn(async () => {})
  setRemoteDescription = jest.fn(async () => {
    this.remoteDescription = {} as any
  })
  addIceCandidate = jest.fn(async () => {})

  createDataChannel() {
    return this.channel as any
  }

  emitIceCandidate(candidate: any) {
    this.onicecandidate?.({ candidate })
  }

  close() {
    this.connectionState = 'closed'
  }
}

describe('PeerConnection', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    ;(global as any).RTCPeerConnection = FakeRTCPeerConnection
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  test('sendData for file-chunk sends metadata json then binary', () => {
    const signals: any[] = []
    const pc = new PeerConnection('peer-1', true, (s) => signals.push(s))

    const channel = (pc as any).dataChannel as FakeRTCDataChannel
    expect(channel).toBeTruthy()

    const buf = new Uint8Array([1, 2, 3]).buffer
    pc.sendData({ type: 'file-chunk', peerId: 'peer-1', chunk: { id: 'f1', index: 0, total: 1, data: buf } })

    expect(channel.sent.length).toBe(2)
    expect(typeof channel.sent[0]).toBe('string')

    const meta = JSON.parse(channel.sent[0])
    expect(meta.type).toBe('file-chunk')
    expect(meta.hasBinaryData).toBe(true)
    expect(meta.chunk).toEqual({ id: 'f1', index: 0, total: 1 })

    expect(channel.sent[1]).toBe(buf)
  })

  test('sendData throws when data channel is not open', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel
    channel.readyState = 'closed'

    expect(() => pc.sendData({ type: 'ping' })).toThrow(/data channel not open/i)
  })

  test('sendData serializes JSON messages and rejects unserializable payloads', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    pc.sendData({ type: 'hello', n: 1 })
    expect(channel.sent[0]).toBe(JSON.stringify({ type: 'hello', n: 1 }))

    const circular: any = { type: 'circular' }
    circular.self = circular

    expect(() => pc.sendData(circular)).toThrow(/failed to serialize data/i)
  })

  test('sendData errors if channel closes after metadata send (binary path)', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    // Close the channel immediately after the first send (metadata).
    const originalSend = channel.send.bind(channel)
    channel.send = (data: any) => {
      originalSend(data)
      if (typeof data === 'string') {
        channel.readyState = 'closed'
      }
    }

    const buf = new Uint8Array([1, 2, 3]).buffer

    expect(() =>
      pc.sendData({ type: 'file-chunk', peerId: 'peer-1', chunk: { id: 'f1', index: 0, total: 1, data: buf } }),
    ).toThrow(/closed after sending metadata/i)
  })

  test('sendData validates chunk metadata', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const buf = new Uint8Array([1]).buffer

    expect(() =>
      pc.sendData({ type: 'file-chunk', peerId: 'peer-1', chunk: { index: 0, total: 1, data: buf } }),
    ).toThrow(/missing chunk id/i)

    expect(() =>
      pc.sendData({ type: 'file-chunk', peerId: 'peer-1', chunk: { id: 'f1', index: '0', total: 1, data: buf } }),
    ).toThrow(/index must be a number/i)

    expect(() =>
      pc.sendData({ type: 'file-chunk', peerId: 'peer-1', chunk: { id: 'f1', index: 0, total: '1', data: buf } }),
    ).toThrow(/total must be a number/i)
  })

  test('onmessage combines metadata + binary into one callback payload', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    const received: any[] = []
    pc.onData((d) => received.push(d))

    // first message: metadata json
    const metadata = {
      type: 'file-chunk',
      hasBinaryData: true,
      peerId: 'peer-1',
      chunk: { id: 'f1', index: 0, total: 1 },
    }
    channel.onmessage?.({ data: JSON.stringify(metadata) })

    // second message: binary
    const buf = new Uint8Array([9, 9]).buffer
    channel.onmessage?.({ data: buf })

    expect(received.length).toBe(1)
    expect(received[0].type).toBe('file-chunk')
    expect(received[0].chunk.id).toBe('f1')
    expect(received[0].chunk.data).toBe(buf)
  })

  test('onmessage invalid JSON triggers onError', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    const errors: Error[] = []
    pc.onError((e) => errors.push(e))

    channel.onmessage?.({ data: '{not json' })

    expect(errors.length).toBe(1)
    expect(errors[0].message).toMatch(/failed to parse data channel message/i)
  })

  test('data channel error and close propagate to callbacks', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    const errors: Error[] = []
    const states: string[] = []
    pc.onError((e) => errors.push(e))
    pc.onStateChange((s) => states.push(s))

    channel.onerror?.({})
    expect(errors[0].message).toMatch(/data channel error/i)

    channel.close()
    expect(states).toContain('closed')
  })

  test('unexpected binary triggers onError', () => {
    const pc = new PeerConnection('peer-1', true, () => {})
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    const errors: Error[] = []
    pc.onError((e) => errors.push(e))

    channel.onmessage?.({ data: new Uint8Array([1]).buffer })

    expect(errors.length).toBe(1)
    expect(errors[0].message).toMatch(/binary data without metadata/i)
  })

  test('initiator connection state change reports connecting until data channel open', () => {
    const states: string[] = []
    const pc = new PeerConnection('peer-1', true, () => {})
    pc.onStateChange((s) => states.push(s))

    const rtc = (pc as any).pc as FakeRTCPeerConnection
    const channel = (pc as any).dataChannel as FakeRTCDataChannel

    rtc.connectionState = 'connected'
    channel.readyState = 'connecting'
    rtc.onconnectionstatechange?.({})

    expect(states).toContain('connecting')

    channel.readyState = 'open'
    rtc.onconnectionstatechange?.({})

    expect(states).toContain('connected')
  })

  test('failed/disconnected states invoke onError', () => {
    const errors: Error[] = []
    const states: string[] = []
    const pc = new PeerConnection('peer-1', true, () => {})
    pc.onError((e) => errors.push(e))
    pc.onStateChange((s) => states.push(s))

    const rtc = (pc as any).pc as FakeRTCPeerConnection
    rtc.connectionState = 'failed'
    rtc.onconnectionstatechange?.({})

    expect(states).toContain('failed')
    expect(errors[0].message).toMatch(/connection failed/i)
  })

  test('ICE failure invokes onError', () => {
    const errors: Error[] = []
    const pc = new PeerConnection('peer-1', true, () => {})
    pc.onError((e) => errors.push(e))

    const rtc = (pc as any).pc as FakeRTCPeerConnection
    rtc.iceConnectionState = 'failed'
    rtc.oniceconnectionstatechange?.({})

    expect(errors.length).toBe(1)
    expect(errors[0].message).toMatch(/ice connection failed/i)
  })

  test('createOffer emits offer signal and handles errors', async () => {
    const signals: any[] = []
    const errors: Error[] = []
    const pc = new PeerConnection('peer-1', true, (s) => signals.push(s))
    pc.onError((e) => errors.push(e))

    await pc.createOffer()
    expect(signals[0]).toEqual(expect.objectContaining({ type: 'offer', peerId: 'peer-1' }))

    // Force createOffer to fail.
    const rtc = (pc as any).pc as FakeRTCPeerConnection
    rtc.createOffer.mockRejectedValueOnce(new Error('nope'))

    await expect(pc.createOffer()).rejects.toThrow('nope')
    expect(errors.some((e) => /failed to create offer/i.test(e.message))).toBe(true)
  })

  test('handleOffer buffers ICE candidates then flushes them and emits answer signal', async () => {
    const signals: any[] = []
    const pc = new PeerConnection('peer-1', false, (s) => signals.push(s))

    const rtc = (pc as any).pc as FakeRTCPeerConnection

    // Buffer candidate because remote description is not set yet.
    await pc.handleIceCandidate({ candidate: 'c1' } as any)
    expect(rtc.addIceCandidate).not.toHaveBeenCalled()

    await pc.handleOffer({ type: 'offer', sdp: 'remote' } as any)

    // After setting remote description, buffered candidate should be processed.
    expect(rtc.addIceCandidate).toHaveBeenCalledWith({ candidate: 'c1' })
    expect(signals.some((s) => s.type === 'answer')).toBe(true)
  })

  test('handleAnswer sets remote description and flushes buffered ICE candidates', async () => {
    const pc = new PeerConnection('peer-1', false, () => {})
    const rtc = (pc as any).pc as FakeRTCPeerConnection

    await pc.handleIceCandidate({ candidate: 'c1' } as any)
    await pc.handleIceCandidate({ candidate: 'c2' } as any)
    expect(rtc.addIceCandidate).not.toHaveBeenCalled()

    await pc.handleAnswer({ type: 'answer', sdp: 'remote' } as any)

    expect(rtc.setRemoteDescription).toHaveBeenCalled()
    expect(rtc.addIceCandidate).toHaveBeenCalledTimes(2)
  })

  test('handleIceCandidate adds directly when remote description is already set', async () => {
    const pc = new PeerConnection('peer-1', false, () => {})
    const rtc = (pc as any).pc as FakeRTCPeerConnection

    // Simulate remote description already applied.
    rtc.remoteDescription = {} as any

    await pc.handleIceCandidate({ candidate: 'c1' } as any)
    expect(rtc.addIceCandidate).toHaveBeenCalledWith({ candidate: 'c1' })
  })

  test('onicecandidate forwards candidate via onSignal', () => {
    const signals: any[] = []
    const pc = new PeerConnection('peer-1', true, (s) => signals.push(s))
    const rtc = (pc as any).pc as FakeRTCPeerConnection

    rtc.emitIceCandidate({ candidate: 'x' })
    expect(signals[0]).toEqual(
      expect.objectContaining({
        type: 'ice-candidate',
        peerId: 'peer-1',
        candidate: { candidate: 'x' },
      }),
    )
  })
})
