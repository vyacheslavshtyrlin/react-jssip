import type {
  AnswerOptions,
  DTMFOptions,
  ReferOptions,
  RTCSession,
  TerminateOptions,
} from "./types";

export class WebRTCSessionController {
  currentSession: RTCSession | null = null;
  mediaStream: MediaStream | null = null;

  public setSession(session: RTCSession | null) {
    this.currentSession = session;
  }

  public setMediaStream(stream: MediaStream) {
    this.mediaStream = stream;
  }

  private getPC(): RTCPeerConnection | null {
    return (this.currentSession as any)?.connection ?? null;
  }

  public cleanup(stopTracks: boolean = true): void {
    const pc = this.getPC();

    if (pc && typeof pc.getSenders === "function") {
      const isClosed =
        pc.connectionState === "closed" || pc.signalingState === "closed";
      if (!isClosed) {
        for (const s of pc.getSenders()) {
          try {
            s.replaceTrack(null);
          } catch {
            // ignore if sender/pc already closed
          }
        }
      }
    }

    if (stopTracks && this.mediaStream) {
      for (const t of this.mediaStream.getTracks()) t.stop();
    }

    this.mediaStream = null;
    this.currentSession = null;
  }

  public answer(options: AnswerOptions = {}): boolean {
    return this.currentSession
      ? (this.currentSession.answer(options), true)
      : false;
  }

  public hangup(options?: TerminateOptions): boolean {
    return this.currentSession
      ? (this.currentSession.terminate(
          options ?? ({ status_code: 486, reason_phrase: "Busy Here" } as any)
        ),
        true)
      : false;
  }

  public mute(): boolean {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = false));
    return this.currentSession
      ? (this.currentSession.mute({ audio: true }), true)
      : false;
  }

  public unmute(): boolean {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = true));
    return this.currentSession
      ? (this.currentSession.unmute({ audio: true }), true)
      : false;
  }

  public hold(): boolean {
    return this.currentSession ? (this.currentSession.hold(), true) : false;
  }

  public unhold(): boolean {
    return this.currentSession ? (this.currentSession.unhold(), true) : false;
  }

  public sendDTMF(tones: string | number, options?: DTMFOptions): boolean {
    return this.currentSession
      ? (this.currentSession.sendDTMF(tones, options), true)
      : false;
  }

  public transfer(target: string, options?: ReferOptions): boolean {
    return this.currentSession
      ? (this.currentSession.refer(target as any, options), true)
      : false;
  }

  public enableVideo(): void {
    this.mediaStream?.getVideoTracks().forEach((t) => (t.enabled = true));
  }

  public disableVideo(): void {
    this.mediaStream?.getVideoTracks().forEach((t) => (t.enabled = false));
  }

  public async switchCamera(
    nextVideoTrack: MediaStreamTrack
  ): Promise<boolean> {
    const pc = this.getPC();
    if (!pc) return false;

    if (!this.mediaStream) this.mediaStream = new MediaStream();

    const old = this.mediaStream.getVideoTracks()[0];
    this.mediaStream.addTrack(nextVideoTrack);
    if (old) this.mediaStream.removeTrack(old);

    const sender = pc.getSenders?.().find((s) => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(nextVideoTrack);

    if (old && old !== nextVideoTrack) old.stop();

    return true;
  }
}
