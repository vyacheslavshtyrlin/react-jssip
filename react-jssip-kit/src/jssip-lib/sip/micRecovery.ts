import type { RTCSession } from "./types";
import type { WebRTCSessionController } from "./sessionController";
import { sipDebugLogger } from "./debugLogging";

export type MicrophoneRecoveryOptions = {
  intervalMs?: number;
  maxRetries?: number;
};

type MicRecoveryDeps = {
  getRtc: (sessionId: string) => WebRTCSessionController | null;
  getSession: (sessionId: string) => RTCSession | null;
  getSessionState: (sessionId: string) => { muted?: boolean } | undefined;
  setSessionMedia: (sessionId: string, stream: MediaStream) => void;
  requestMicrophoneStream: (deviceId?: string) => Promise<MediaStream>;
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

      retries += 1;
      if (trackLive && !senderLive && track) {
        await rtc.replaceAudioTrack(track);
        return;
      }

      let nextStream: MediaStream;
      try {
        const deviceId =
          track?.getSettings?.().deviceId ??
          sender?.track?.getSettings?.().deviceId;
        nextStream = await this.deps.requestMicrophoneStream(deviceId);
      } catch (err) {
        console.warn("[sip] mic recovery failed to get stream", err);
        return;
      }
      const nextTrack = nextStream.getAudioTracks()[0];
      if (!nextTrack) return;

      await rtc.replaceAudioTrack(nextTrack);
      this.deps.setSessionMedia(sessionId, nextStream);
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

    const stop = () => {
      stopped = true;
      clearInterval(timer);
      pc?.removeEventListener?.("iceconnectionstatechange", onIceChange);
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
