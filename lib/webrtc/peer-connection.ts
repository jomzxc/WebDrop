export class PeerConnection {
  private pc: RTCPeerConnection
  private dataChannel: RTCDataChannel | null = null
  private onDataCallback: ((data: any) => void) | null = null
  private onStateChangeCallback: ((state: string) => void) | null = null

  constructor(
    private peerId: string,
    private isInitiator: boolean,
    private onSignal: (signal: any) => void,
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
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
      console.log("[v0] Connection state:", this.pc.connectionState)
      this.onStateChangeCallback?.(this.pc.connectionState)
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
      console.log("[v0] Data channel opened")
    }

    this.dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.onDataCallback?.(data)
    }

    this.dataChannel.onerror = (error) => {
      console.error("[v0] Data channel error:", error)
    }
  }

  async createOffer() {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.onSignal({
      type: "offer",
      offer,
      peerId: this.peerId,
    })
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(offer)
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.onSignal({
      type: "answer",
      answer,
      peerId: this.peerId,
    })
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(answer)
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(candidate)
  }

  sendData(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(data))
    }
  }

  onData(callback: (data: any) => void) {
    this.onDataCallback = callback
  }

  onStateChange(callback: (state: string) => void) {
    this.onStateChangeCallback = callback
  }

  close() {
    this.dataChannel?.close()
    this.pc.close()
  }
}
