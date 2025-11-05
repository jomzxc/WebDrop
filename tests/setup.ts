import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock RTCPeerConnection for WebRTC tests
global.RTCPeerConnection = class MockRTCPeerConnection {
  localDescription = null
  remoteDescription = null
  signalingState = 'stable'
  iceConnectionState = 'new'
  connectionState = 'new'
  iceGatheringState = 'new'
  
  onicecandidate = null
  ondatachannel = null
  onconnectionstatechange = null
  oniceconnectionstatechange = null
  
  createOffer = () => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' })
  createAnswer = () => Promise.resolve({ type: 'answer', sdp: 'mock-sdp' })
  setLocalDescription = (desc: any) => { this.localDescription = desc; return Promise.resolve() }
  setRemoteDescription = (desc: any) => { this.remoteDescription = desc; return Promise.resolve() }
  addIceCandidate = () => Promise.resolve()
  createDataChannel = (label: string, options?: any) => ({
    label,
    readyState: 'connecting',
    send: () => {},
    close: () => {},
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  })
  close = () => {}
} as any

// Mock RTCSessionDescription
global.RTCSessionDescription = class MockRTCSessionDescription {
  type: string
  sdp: string
  
  constructor(init: { type: string; sdp: string }) {
    this.type = init.type
    this.sdp = init.sdp
  }
} as any

// Mock File API for file upload tests
if (typeof File === 'undefined') {
  global.File = class MockFile extends Blob {
    name: string
    lastModified: number
    
    constructor(bits: any[], name: string, options?: any) {
      super(bits, options)
      this.name = name
      this.lastModified = options?.lastModified || Date.now()
    }
    
    // Add arrayBuffer method if not present
    async arrayBuffer(): Promise<ArrayBuffer> {
      return super.arrayBuffer ? super.arrayBuffer() : Promise.resolve(new ArrayBuffer(0))
    }
  } as any
}

// Ensure Blob has arrayBuffer method in test environment
if (Blob.prototype.arrayBuffer === undefined) {
  Blob.prototype.arrayBuffer = async function() {
    return new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as ArrayBuffer)
      }
      reader.readAsArrayBuffer(this)
    })
  }
}
