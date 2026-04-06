import type { RTCSession } from "../../sip/types";
import type { WebRTCSessionController } from "./webrtc-session.controller";
import { sipDebugLogger } from "../debug/sip-debug.logger";

export type MicrophoneRecoveryOptions = {
  intervalMs?: number;
  maxRetries?: number;
};

type MicRecoveryDeps = {
  getRtc: (sessionId: string) => WebRTCSessionController | null;
  getSession: (sessionId: string) => RTCSession | null;
  getSessionState: (sessionId: string) => { muted?: boolean } | undefined;
  setSessionMedia: (sessionId: string, stream: MediaStream) => void;
  onDrop: (sessionId: string, trackLive: boolean, senderLive: boolean) => void;
};

type MicRecoveryConfig = {
  enabled?: boolean;
  intervalMs?: number;
  maxRetries?: number;
};

export class MicRecoveryManager {
  private enabled = false;
  private defaults: Required<MicrophoneRecoveryOptions> = {
    intervalMs: 2000,
    maxRetries: Infinity,
  };
  private active = new Map<string, { stop: () => void }>();
  private syncedSenderTrackId = new Map<string, string>();
  private readonly deps: MicRecoveryDeps;

  constructor(deps: MicRecoveryDeps) {
    this.deps = deps;
  }

  configure(config: MicRecoveryConfig) {
    if (typeof config.enabled === "boolean") {
      this.enabled = config.enabled;
    }
    if (typeof config.intervalMs === "number") {
      this.defaults.intervalMs = config.intervalMs;
    }
    if (typeof config.maxRetries === "number") {
      this.defaults.maxRetries = config.maxRetries;
    }
  }

  enable(
    sessionId: string,
    options: MicrophoneRecoveryOptions = {}
  ): () => void {
    if (!this.enabled) return () => {};

    this.disable(sessionId);

    const intervalMs = options.intervalMs ?? this.defaults.intervalMs;
    const maxRetries = options.maxRetries ?? this.defaults.maxRetries;
    let retries = 0;
    let stopped = false;
    const startedAt = Date.now();
    const warmupMs = Math.max(intervalMs * 2, 2000);

    const tick = async () => {
      if (stopped || retries >= maxRetries) return;

      const rtc = this.deps.getRtc(sessionId);
      const session = this.deps.getSession(sessionId);
      if (!rtc || !session) return;

      const sessionState = this.deps.getSessionState(sessionId);
      if (sessionState?.muted) return;

      const stream = rtc.mediaStream;
      const track = stream?.getAudioTracks?.()[0];
      const pc: RTCPeerConnection | undefined = (session as any)?.connection;
      const sender = pc
        ?.getSenders?.()
        ?.find((s: RTCRtpSender) => s.track?.kind === "audio");

      if (!track && !sender) return;
      if (!track && sender?.track?.readyState === "live") {
        const nextId = sender.track.id;
        const prevId = this.syncedSenderTrackId.get(sessionId);
        if (prevId === nextId) return;
        this.syncedSenderTrackId.set(sessionId, nextId);
        this.deps.setSessionMedia(sessionId, new MediaStream([sender.track]));
        return;
      }

      if (Date.now() - startedAt < warmupMs) return;
      if (
        pc?.connectionState === "new" ||
        pc?.connectionState === "connecting" ||
        pc?.iceConnectionState === "new" ||
        pc?.iceConnectionState === "checking"
      ) {
        return;
      }

      const trackLive = track?.readyState === "live";
      const senderLive = sender?.track?.readyState === "live";
      if (trackLive && senderLive) return;

      sipDebugLogger.logMicRecoveryDrop({
        sessionId,
        trackLive,
        senderLive,
      });
      this.deps.onDrop(sessionId, trackLive, senderLive);

      retries += 1;
      if (trackLive && !senderLive && track) {
        await rtc.replaceAudioTrack(track);
        return;
      }

      // No internal getUserMedia request path in library.
      // If both track and sender are not live, recovery stops here.
    };

    const timer = setInterval(() => {
      void tick();
    }, intervalMs);
    void tick();

    const session = this.deps.getSession(sessionId);
    const pc: RTCPeerConnection | undefined = (session as any)?.connection;
    const onIceChange = () => {
      const state = pc?.iceConnectionState;
      if (state === "failed" || state === "disconnected") void tick();
    };
    pc?.addEventListener?.("iceconnectionstatechange", onIceChange);

    // Immediate dead-track check — bypasses warmup.
    // Catches tracks that died at or just before confirmed.
    const rtcNow = this.deps.getRtc(sessionId);
    const initialTrack = rtcNow?.mediaStream?.getAudioTracks?.()[0] ?? null;
    if (initialTrack && initialTrack.readyState !== "live") {
      this.deps.onDrop(sessionId, false, false);
    }

    // Real-time detection via track.ended — no need to wait for poll interval.
    const onTrackEnded = () => {
      if (stopped) return;
      const sessionState = this.deps.getSessionState(sessionId);
      if (sessionState?.muted) return;
      this.deps.onDrop(sessionId, false, false);
    };
    initialTrack?.addEventListener?.("ended", onTrackEnded, { once: true });

    const stop = () => {
      stopped = true;
      clearInterval(timer);
      pc?.removeEventListener?.("iceconnectionstatechange", onIceChange);
      initialTrack?.removeEventListener?.("ended", onTrackEnded);
    };
    this.active.set(sessionId, { stop });
    return stop;
  }

  disable(sessionId: string) {
    const entry = this.active.get(sessionId);
    if (!entry) return false;
    entry.stop();
    this.active.delete(sessionId);
    this.syncedSenderTrackId.delete(sessionId);
    return true;
  }

  cleanupAll() {
    this.active.forEach((entry) => entry.stop());
    this.active.clear();
    this.syncedSenderTrackId.clear();
  }
}
