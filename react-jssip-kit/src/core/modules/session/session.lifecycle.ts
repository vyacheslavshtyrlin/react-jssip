import type { SipStateStore } from "../state/sip.state.store";
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

type Deps = {
  state: SipStateStore;
  sessionManager: SessionManager;
  emit: <K extends JsSIPEventName>(
    event: K,
    payload?: JsSIPEventPayload<K>
  ) => void;
  attachSessionHandlers: (sessionId: string, session: RTCSession) => void;
  getMaxSessionCount: () => number;
};

export class SessionLifecycle {
  private readonly state: SipStateStore;
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
    if (currentSessions.length >= this.getMaxSessionCount()) {
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
    });

    this.emit("newRTCSession", e);
  }

  private bindLocalOutgoingAudio(sessionId: string, session: RTCSession) {
    const maxAttempts = 50;
    const retryDelayMs = 500;
    let attempts = 0;
    let retryScheduled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let exhausted = false;
    let exhaustedCheckUsed = false;
    let attachedPc: RTCPeerConnection | null = null;
    const logLocalAudioError = (
      message: string,
      pc?: RTCPeerConnection | null,
      extra?: Record<string, unknown>
    ) => {
      sipDebugLogger.logLocalAudioError(sessionId, message, pc, extra);
    };

    const tryBindFromPc = (pc?: RTCPeerConnection | null) => {
      if (
        stopped ||
        !pc ||
        this.sessionManager.getRtc(sessionId)?.mediaStream
      ) {
        return false;
      }
      const audioSender = pc
        ?.getSenders?.()
        ?.find((s: RTCRtpSender) => s.track?.kind === "audio");
      const audioTrack = audioSender?.track;
      if (!audioTrack) {
        logLocalAudioError(
          "[sip] outgoing audio bind failed: no audio track",
          pc
        );
        return false;
      }
      const outgoingStream = new MediaStream([audioTrack]);
      this.sessionManager.setSessionMedia(sessionId, outgoingStream);
      return true;
    };

    const onPcStateChange = () => {
      if (stopped) return;
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (tryBindFromPc(attachedPc)) stopRetry();
        return;
      }
      if (tryBindFromPc(attachedPc)) stopRetry();
    };

    const attachPcListeners = (pc?: RTCPeerConnection | null) => {
      if (!pc || pc === attachedPc) return;
      if (attachedPc) {
        attachedPc.removeEventListener?.(
          "signalingstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "connectionstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "iceconnectionstatechange",
          onPcStateChange
        );
      }
      attachedPc = pc;
      attachedPc.addEventListener?.("signalingstatechange", onPcStateChange);
      attachedPc.addEventListener?.("connectionstatechange", onPcStateChange);
      attachedPc.addEventListener?.(
        "iceconnectionstatechange",
        onPcStateChange
      );
    };

    const clearRetryTimer = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    };

    const stopRetry = () => {
      if (stopped) return;
      stopped = true;
      clearRetryTimer();
      if (attachedPc) {
        attachedPc.removeEventListener?.(
          "signalingstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "connectionstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "iceconnectionstatechange",
          onPcStateChange
        );
        attachedPc = null;
      }
      session.off?.("peerconnection", onPeer);
      session.off?.("confirmed", onConfirmed);
      session.off?.("ended", stopRetry);
      session.off?.("failed", stopRetry);
    };

    const scheduleRetry = (pc?: RTCPeerConnection | null) => {
      if (stopped || retryScheduled || exhausted) return;
      if (attempts >= maxAttempts) {
        logLocalAudioError(
          "[sip] outgoing audio bind failed: max retries reached",
          pc,
          { attempts }
        );
        exhausted = true;
        clearRetryTimer();
        return;
      }
      if (!pc) {
        logLocalAudioError(
          "[sip] outgoing audio bind failed: missing peerconnection",
          pc
        );
      }
      retryScheduled = true;
      attempts += 1;
      retryTimer = setTimeout(() => {
        retryScheduled = false;
        retryTimer = null;
        if (tryBindFromPc(pc)) {
          stopRetry();
          return;
        }
        scheduleRetry(pc);
      }, retryDelayMs);
    };

    const onPeer = (data: { peerconnection: RTCPeerConnection }) => {
      if (stopped) return;
      attachPcListeners(data.peerconnection);
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (tryBindFromPc(data.peerconnection)) stopRetry();
        return;
      }
      if (tryBindFromPc(data.peerconnection)) {
        stopRetry();
        return;
      }
      scheduleRetry(data.peerconnection);
    };

    const onConfirmed = () => {
      if (stopped) return;
      const currentPc =
        (session as RTCSession & { connection?: RTCPeerConnection })
          ?.connection ?? attachedPc;
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (tryBindFromPc(currentPc)) stopRetry();
        return;
      }
      if (tryBindFromPc(currentPc)) {
        stopRetry();
        return;
      }
      scheduleRetry(currentPc);
    };

    const existingPc = (
      session as RTCSession & {
        connection?: RTCPeerConnection;
      }
    )?.connection;
    if (!tryBindFromPc(existingPc)) {
      if (existingPc) {
        attachPcListeners(existingPc);
        scheduleRetry(existingPc);
      }
      session.on?.("peerconnection", onPeer);
    }
    session.on?.("confirmed", onConfirmed);
    session.on?.("ended", () => stopRetry());
    session.on?.("failed", () => stopRetry());
  }

  private bindRemoteIncomingAudio(sessionId: string, session: RTCSession) {
    const maxAttempts = 50;
    const retryDelayMs = 500;
    let attempts = 0;
    let retryScheduled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let exhausted = false;
    let exhaustedCheckUsed = false;
    let attachedPc: RTCPeerConnection | null = null;
    let attachedTrack: MediaStreamTrack | null = null;
    const logRemoteAudioError = (
      message: string,
      pc?: RTCPeerConnection | null,
      extra?: Record<string, unknown>
    ) => {
      sipDebugLogger.logRemoteAudioError(sessionId, message, pc, extra);
    };

    const logMissingReceiver = (
      pc?: RTCPeerConnection | null,
      note?: string
    ) => {
      logRemoteAudioError(
        "[sip] incoming audio bind failed: no remote track",
        pc,
        { note }
      );
    };

    const getRemoteAudioTrack = (pc?: RTCPeerConnection | null) => {
      const receiver = pc
        ?.getReceivers?.()
        ?.find((r: RTCRtpReceiver) => r.track?.kind === "audio");
      return receiver?.track ?? null;
    };

    const attachTrackListeners = (track?: MediaStreamTrack | null) => {
      if (!track || track === attachedTrack) return;
      if (attachedTrack) {
        attachedTrack.removeEventListener?.("ended", onRemoteEnded);
        attachedTrack.removeEventListener?.("mute", onRemoteMuted);
      }
      attachedTrack = track;
      attachedTrack.addEventListener?.("ended", onRemoteEnded);
      attachedTrack.addEventListener?.("mute", onRemoteMuted);
    };

    const checkRemoteTrack = (pc?: RTCPeerConnection | null) => {
      if (stopped || !pc) return false;
      const track = getRemoteAudioTrack(pc);
      if (!track) return false;
      attachTrackListeners(track);
      if (track.readyState !== "live") {
        logRemoteAudioError("[sip] incoming audio track not live", pc, {
          trackState: track.readyState,
        });
      }
      return true;
    };

    const onRemoteEnded = () => {
      logRemoteAudioError("[sip] incoming audio track ended", attachedPc);
    };

    const onRemoteMuted = () => {
      logRemoteAudioError("[sip] incoming audio track muted", attachedPc);
    };

    const onPcStateChange = () => {
      if (stopped) return;
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (checkRemoteTrack(attachedPc)) stopRetry({ keepTrack: true });
        return;
      }
      if (checkRemoteTrack(attachedPc)) stopRetry({ keepTrack: true });
    };

    const attachPcListeners = (pc?: RTCPeerConnection | null) => {
      if (!pc || pc === attachedPc) return;
      if (attachedPc) {
        attachedPc.removeEventListener?.(
          "signalingstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "connectionstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "iceconnectionstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.("track", onTrack);
      }
      attachedPc = pc;
      attachedPc.addEventListener?.("signalingstatechange", onPcStateChange);
      attachedPc.addEventListener?.("connectionstatechange", onPcStateChange);
      attachedPc.addEventListener?.(
        "iceconnectionstatechange",
        onPcStateChange
      );
      attachedPc.addEventListener?.("track", onTrack);
    };

    const clearRetryTimer = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    };

    const stopRetry = (opts: { keepTrack?: boolean } = {}) => {
      if (stopped) return;
      stopped = true;
      clearRetryTimer();
      if (attachedPc) {
        attachedPc.removeEventListener?.(
          "signalingstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "connectionstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.(
          "iceconnectionstatechange",
          onPcStateChange
        );
        attachedPc.removeEventListener?.("track", onTrack);
        attachedPc = null;
      }
      if (attachedTrack && !opts.keepTrack) {
        attachedTrack.removeEventListener?.("ended", onRemoteEnded);
        attachedTrack.removeEventListener?.("mute", onRemoteMuted);
        attachedTrack = null;
      }
      session.off?.("peerconnection", onPeer);
      session.off?.("confirmed", onConfirmed);
      session.off?.("ended", stopRetry);
      session.off?.("failed", stopRetry);
    };

    const scheduleRetry = (pc?: RTCPeerConnection | null) => {
      if (stopped || retryScheduled || exhausted) return;
      if (attempts >= maxAttempts) {
        logRemoteAudioError(
          "[sip] incoming audio bind failed: max retries reached",
          pc,
          { attempts }
        );
        exhausted = true;
        clearRetryTimer();
        return;
      }
      retryScheduled = true;
      attempts += 1;
      retryTimer = setTimeout(() => {
        retryScheduled = false;
        retryTimer = null;
        if (checkRemoteTrack(pc)) {
          stopRetry({ keepTrack: true });
          return;
        }
        if (!pc) logMissingReceiver(pc, "missing peerconnection");
        scheduleRetry(pc);
      }, retryDelayMs);
    };

    const onTrack = () => {
      if (stopped) return;
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (checkRemoteTrack(attachedPc)) stopRetry({ keepTrack: true });
        return;
      }
      if (checkRemoteTrack(attachedPc)) stopRetry({ keepTrack: true });
    };

    const onPeer = (data: { peerconnection: RTCPeerConnection }) => {
      if (stopped) return;
      attachPcListeners(data.peerconnection);
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (checkRemoteTrack(data.peerconnection))
          stopRetry({ keepTrack: true });
        return;
      }
      if (checkRemoteTrack(data.peerconnection)) {
        stopRetry({ keepTrack: true });
        return;
      }
      scheduleRetry(data.peerconnection);
    };

    const onConfirmed = () => {
      if (stopped) return;
      const currentPc =
        (session as RTCSession & { connection?: RTCPeerConnection })
          ?.connection ?? attachedPc;
      if (exhausted) {
        if (exhaustedCheckUsed) return;
        exhaustedCheckUsed = true;
        if (checkRemoteTrack(currentPc)) stopRetry({ keepTrack: true });
        return;
      }
      if (checkRemoteTrack(currentPc)) {
        stopRetry({ keepTrack: true });
        return;
      }
      logMissingReceiver(currentPc, "confirmed without remote track");
      scheduleRetry(currentPc);
    };

    const existingPc = (
      session as RTCSession & {
        connection?: RTCPeerConnection;
      }
    )?.connection;
    if (!checkRemoteTrack(existingPc)) {
      if (existingPc) {
        attachPcListeners(existingPc);
        scheduleRetry(existingPc);
      }
      session.on?.("peerconnection", onPeer);
    }
    session.on?.("confirmed", onConfirmed);
    session.on?.("ended", () => stopRetry());
    session.on?.("failed", () => stopRetry());
  }

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
  }
}
