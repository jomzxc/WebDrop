export class PeerConnection {
  private pc: RTCPeerConnection
  private dataChannel: RTCDataChannel | null = null
  private onDataCallback: ((data: any) => void) | null = null
  private onStateChangeCallback: ((state: string) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null

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
      this.onStateChangeCallback?.(state)

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
      this.onStateChangeCallback?.("connected")
    }

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.onDataCallback?.(data)
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
    } catch (error) {
      this.onErrorCallback?.(new Error("Failed to handle answer"))
      throw error
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(candidate)
    } catch (error) {
      this.onErrorCallback?.(new Error("Failed to add ICE candidate"))
      throw error
    }
  }

  sendData(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      try {
        this.dataChannel.send(JSON.stringify(data))
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
}
