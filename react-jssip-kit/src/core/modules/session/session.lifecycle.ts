import type { StateAdapter } from "../../contracts/state";
import { CallStatus } from "../../contracts/state";
import type { SessionManager } from "./session.manager";
import {
  holdOtherSessions,
  upsertSessionState,
} from "./session.state.projector";
import type {
  JsSIPEventName,
  JsSIPEventPayload,
  RTCSession,
  RTCSessionEvent,
  TerminateOptions,
} from "../../sip/types";
import { sipDebugLogger } from "../debug/sip-debug.logger";
import { createAudioBindRetry } from "./audio-bind.retry";

type Deps = {
  state: StateAdapter;
  sessionManager: SessionManager;
  emit: <K extends JsSIPEventName>(
    event: K,
    payload?: JsSIPEventPayload<K>
  ) => void;
  attachSessionHandlers: (sessionId: string, session: RTCSession) => void;
  getMaxSessionCount: () => number;
};

export class SessionLifecycle {
  private readonly state: StateAdapter;
  private readonly sessionManager: SessionManager;
  private readonly emit: Deps["emit"];
  private readonly attachSessionHandlers: Deps["attachSessionHandlers"];
  private readonly getMaxSessionCount: Deps["getMaxSessionCount"];

  constructor(deps: Deps) {
    this.state = deps.state;
    this.sessionManager = deps.sessionManager;
    this.emit = deps.emit;
    this.attachSessionHandlers = deps.attachSessionHandlers;
    this.getMaxSessionCount = deps.getMaxSessionCount;
  }

  public setDebugEnabled(enabled: boolean) {
    sipDebugLogger.setEnabled(enabled);
  }

  handleNewRTCSession(e: RTCSessionEvent) {
    const session = e.session;
    const sessionId = String(session.id ?? crypto.randomUUID?.() ?? Date.now());

    const currentSessions = this.state.getState().sessions;
    if (e.originator === "remote" && currentSessions.length >= this.getMaxSessionCount()) {
      try {
        const terminateOptions: TerminateOptions = {
          status_code: 486,
          reason_phrase: "Busy Here",
        };
        session.terminate(terminateOptions);
      } catch {
        /* ignore termination errors */
      }
      return;
    }

    const rtc = this.sessionManager.getOrCreateRtc(sessionId, session);
    this.sessionManager.setSession(sessionId, session);
    this.attachSessionHandlers(sessionId, session);
    this.attachCallStatsLogging(sessionId, session);

    if (e.originator === "local" && !rtc.mediaStream) {
      this.bindLocalOutgoingAudio(sessionId, session);
    }
    if (e.originator === "remote") {
      this.bindRemoteIncomingAudio(sessionId, session);
    }

    holdOtherSessions(this.state, sessionId, (id) => {
      const otherRtc = this.sessionManager.getRtc(id);
      otherRtc?.hold();
    });

    upsertSessionState(this.state, sessionId, {
      direction: e.originator,
      from: e.originator === "remote" ? e.request.from.uri.user : null,
      to: e.request.to.uri.user,
      status:
        e.originator === "remote" ? CallStatus.Ringing : CallStatus.Dialing,
      headers: this.extractSipHeaders(e.request),
    });

    this.emit("newRTCSession", e);
  }

  private bindLocalOutgoingAudio(sessionId: string, session: RTCSession) {
    createAudioBindRetry({
      session,
      tryBind: (pc) => {
        // Already bound externally or from a previous attempt — signal success.
        if (this.sessionManager.getRtc(sessionId)?.mediaStream) return true;
        if (!pc) return false;
        const audioSender = pc
          .getSenders?.()
          ?.find((s: RTCRtpSender) => s.track?.kind === "audio");
        const audioTrack = audioSender?.track;
        if (!audioTrack) {
          sipDebugLogger.logLocalAudioError(
            sessionId,
            "[sip] outgoing audio bind failed: no audio track",
            pc
          );
          return false;
        }
        const outgoingStream = new MediaStream([audioTrack]);
        this.sessionManager.setSessionMedia(sessionId, outgoingStream);
        return true;
      },
      onExhausted: (pc, attempts) => {
        sipDebugLogger.logLocalAudioError(
          sessionId,
          "[sip] outgoing audio bind failed: max retries reached",
          pc,
          { attempts }
        );
      },
    });
  }

  private bindRemoteIncomingAudio(sessionId: string, session: RTCSession) {
    let attachedTrack: MediaStreamTrack | null = null;

    const onRemoteEnded = () => {
      sipDebugLogger.logRemoteAudioError(
        sessionId,
        "[sip] incoming audio track ended",
        null
      );
    };
    const onRemoteMuted = () => {
      sipDebugLogger.logRemoteAudioError(
        sessionId,
        "[sip] incoming audio track muted",
        null
      );
    };

    const attachTrackListeners = (track: MediaStreamTrack) => {
      if (track === attachedTrack) return;
      if (attachedTrack) {
        attachedTrack.removeEventListener("ended", onRemoteEnded);
        attachedTrack.removeEventListener("mute", onRemoteMuted);
      }
      attachedTrack = track;
      track.addEventListener("ended", onRemoteEnded);
      track.addEventListener("mute", onRemoteMuted);
    };

    const detachTrackListeners = () => {
      if (!attachedTrack) return;
      attachedTrack.removeEventListener("ended", onRemoteEnded);
      attachedTrack.removeEventListener("mute", onRemoteMuted);
      attachedTrack = null;
    };

    createAudioBindRetry({
      session,
      listenPcTrackEvent: true,
      tryBind: (pc) => {
        if (!pc) return false;
        const receiver = pc
          .getReceivers?.()
          ?.find((r: RTCRtpReceiver) => r.track?.kind === "audio");
        const track = receiver?.track ?? null;
        if (!track) return false;
        attachTrackListeners(track);
        if (track.readyState !== "live") {
          sipDebugLogger.logRemoteAudioError(
            sessionId,
            "[sip] incoming audio track not live",
            pc,
            { trackState: track.readyState }
          );
        }
        return true;
      },
      onStop: (bound) => {
        // Keep track listeners active after successful bind (diagnostic monitoring).
        // Remove them only on failure / cleanup.
        if (!bound) detachTrackListeners();
      },
      onExhausted: (pc, attempts) => {
        sipDebugLogger.logRemoteAudioError(
          sessionId,
          "[sip] incoming audio bind failed: max retries reached",
          pc,
          { attempts }
        );
      },
      onConfirmedMiss: (pc) => {
        sipDebugLogger.logRemoteAudioError(
          sessionId,
          "[sip] incoming audio bind failed: no remote track",
          pc,
          { note: "confirmed without remote track" }
        );
      },
    });
  }

  private callStatsCleanups = new Map<string, () => void>();

  private attachCallStatsLogging(sessionId: string, session: RTCSession) {
    const onConfirmed = () => {
      sipDebugLogger.startCallStatsLogging(sessionId, session);
    };
    const onEnd = () => {
      sipDebugLogger.stopCallStatsLogging(sessionId);
    };

    session.on?.("confirmed", onConfirmed);
    session.on?.("ended", onEnd);
    session.on?.("failed", onEnd);

    this.callStatsCleanups.set(sessionId, () => {
      session.off?.("confirmed", onConfirmed);
      session.off?.("ended", onEnd);
      session.off?.("failed", onEnd);
    });
  }

  public cleanupCallStats(sessionId: string) {
    const cleanup = this.callStatsCleanups.get(sessionId);
    cleanup?.();
    this.callStatsCleanups.delete(sessionId);
  }

  public cleanupAllCallStats() {
    this.callStatsCleanups.forEach((cleanup) => cleanup());
    this.callStatsCleanups.clear();
  }

  private extractSipHeaders(request: unknown): Record<string, string> {
    // JsSIP does not expose a typed headers map — access via cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = request as any;
    const headerMap = req?.headers as Record<string, unknown[]> | undefined;
    if (!headerMap || typeof headerMap !== "object") return {};
    const result: Record<string, string> = {};
    for (const name of Object.keys(headerMap)) {
      const value = req.getHeader?.(name) as string | undefined;
      if (value != null) {
        result[name.toLowerCase()] = value;
      }
    }
    return result;
  }
}
