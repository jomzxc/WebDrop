export class PeerConnection {
  private pc: RTCPeerConnection
  private dataChannel: RTCDataChannel | null = null
  private onDataCallback: ((data: any) => void) | null = null
  private onStateChangeCallback: ((state: string) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null
  private iceCandidateBuffer: RTCIceCandidateInit[] = []
  private pendingBinaryMetadata: any = null

  constructor(
    private peerId: string,
    private isInitiator: boolean,
    private onSignal: (signal: any) => void,
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    })

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: "ice-candidate",
          candidate: event.candidate,
          peerId: this.peerId,
        })
      }
    }

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      
      // Only report connected if both peer connection and data channel are ready
      if (state === "connected") {
        if (this.isFullyConnected()) {
          this.onStateChangeCallback?.("connected")
        } else {
          // Peer connection is ready but data channel isn't open yet
          this.onStateChangeCallback?.("connecting")
        }
      } else if (state === "connecting" || state === "new") {
        this.onStateChangeCallback?.("connecting")
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        this.onStateChangeCallback?.(state)
      }

      if (state === "failed" || state === "disconnected") {
        this.onErrorCallback?.(new Error(`Connection ${state}`))
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "failed") {
        this.onErrorCallback?.(new Error("ICE connection failed"))
      }
    }

    if (this.isInitiator) {
      this.createDataChannel()
    } else {
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel
        this.setupDataChannel()
      }
    }
  }

  private createDataChannel() {
    this.dataChannel = this.pc.createDataChannel("fileTransfer", {
      ordered: true,
    })
    this.setupDataChannel()
  }

  private setupDataChannel() {
    if (!this.dataChannel) return

    this.dataChannel.onopen = () => {
      // Check if both peer connection and data channel are ready
      if (this.isFullyConnected()) {
        this.onStateChangeCallback?.("connected")
      }
    }

    this.dataChannel.onmessage = (event) => {
      try {
        // Handle binary data (ArrayBuffer)
        if (event.data instanceof ArrayBuffer) {
          if (this.pendingBinaryMetadata) {
            // Combine metadata with binary data
            const completeData = {
              ...this.pendingBinaryMetadata,
              chunk: {
                ...this.pendingBinaryMetadata.chunk,
                data: event.data,
              },
            }
            this.pendingBinaryMetadata = null
            this.onDataCallback?.(completeData)
          } else {
            // Unexpected binary data - log error
            console.error("Received binary data without metadata")
            this.onErrorCallback?.(new Error("Received binary data without metadata"))
          }
        } else {
          // Handle JSON messages
          const data = JSON.parse(event.data)
          if (data.hasBinaryData) {
            // Store metadata, wait for next message with binary data
            this.pendingBinaryMetadata = data
          } else {
            this.onDataCallback?.(data)
          }
        }
      } catch (error) {
        this.onErrorCallback?.(new Error("Failed to parse data channel message"))
      }
    }

    this.dataChannel.onerror = (error) => {
      this.onErrorCallback?.(new Error("Data channel error"))
    }

    this.dataChannel.onclose = () => {
      this.onStateChangeCallback?.("closed")
    }
    
    // If data channel is already open when we setup (can happen in race conditions)
    if (this.isFullyConnected()) {
      this.onStateChangeCallback?.("connected")
    }
  }

  async createOffer() {
    try {
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      this.onSignal({
        type: "offer",
        offer,
        peerId: this.peerId,
      })
    } catch (error) {
      this.onErrorCallback?.(new Error("Failed to create offer"))
      throw error
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      await this.pc.setRemoteDescription(offer)
      await this.processPendingIceCandidates()
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)
      this.onSignal({
        type: "answer",
        answer,
        peerId: this.peerId,
      })
    } catch (error) {
      this.onErrorCallback?.(new Error("Failed to handle offer"))
      throw error
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      await this.pc.setRemoteDescription(answer)
      await this.processPendingIceCandidates()
    } catch (error) {
      this.onErrorCallback?.(new Error("Failed to handle answer"))
      throw error
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (!this.pc.remoteDescription) {
        this.iceCandidateBuffer.push(candidate)
        return
      }
      await this.pc.addIceCandidate(candidate)
    } catch (error) {
      this.onErrorCallback?.(new Error("Failed to add ICE candidate"))
      throw error
    }
  }

  private async processPendingIceCandidates() {
    if (this.iceCandidateBuffer.length === 0) return

    for (const candidate of this.iceCandidateBuffer) {
      try {
        await this.pc.addIceCandidate(candidate)
      } catch (error) {
        console.error("Failed to add buffered ICE candidate:", error)
      }
    }
    this.iceCandidateBuffer = []
  }

  sendData(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      try {
        // Handle binary data (ArrayBuffer) separately from JSON
        if (data.type === "file-chunk" && data.chunk?.data instanceof ArrayBuffer) {
          // Send binary data with metadata header
          const metadata = {
            type: data.type,
            chunk: {
              id: data.chunk.id,
              index: data.chunk.index,
              total: data.chunk.total,
            },
            peerId: data.peerId,
          }
          // Send metadata as JSON first, then binary data follows
          this.dataChannel.send(JSON.stringify({ ...metadata, hasBinaryData: true }))
          this.dataChannel.send(data.chunk.data)
        } else {
          // Regular JSON messages
          this.dataChannel.send(JSON.stringify(data))
        }
      } catch (error) {
        this.onErrorCallback?.(new Error("Failed to send data"))
      }
    } else {
      this.onErrorCallback?.(new Error("Data channel not open"))
    }
  }

  onData(callback: (data: any) => void) {
    this.onDataCallback = callback
  }

  onStateChange(callback: (state: string) => void) {
    this.onStateChangeCallback = callback
  }

  onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback
  }

  close() {
    this.dataChannel?.close()
    this.pc.close()
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState
  }

  getBufferedAmount(): number {
    return this.dataChannel?.bufferedAmount || 0
  }

  isFullyConnected(): boolean {
    return this.pc.connectionState === "connected" && this.dataChannel?.readyState === "open"
  }
}
