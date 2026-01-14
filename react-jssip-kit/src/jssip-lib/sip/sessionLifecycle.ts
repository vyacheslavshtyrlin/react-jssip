import { SipStateStore } from "../core/sipStateStore";
import { CallDirection, CallStatus } from "../core/types";
import { SessionManager } from "./sessionManager";
import { holdOtherSessions, upsertSessionState } from "./sessionState";
import type { JsSIPEventName, RTCSession, RTCSessionEvent } from "./types";
import type { SipErrorPayload } from "../core/sipErrorHandler";

type Deps = {
  state: SipStateStore;
  sessionManager: SessionManager;
  emit: <K extends JsSIPEventName>(event: K, payload: any) => void;
  emitError: (raw: any, code?: string, fallback?: string) => SipErrorPayload;
  attachSessionHandlers: (sessionId: string, session: RTCSession) => void;
  getMaxSessionCount: () => number;
};

export class SessionLifecycle {
  private readonly state: SipStateStore;
  private readonly sessionManager: SessionManager;
  private readonly emit: Deps["emit"];
  private readonly emitError: Deps["emitError"];
  private readonly attachSessionHandlers: Deps["attachSessionHandlers"];
  private readonly getMaxSessionCount: Deps["getMaxSessionCount"];

  constructor(deps: Deps) {
    this.state = deps.state;
    this.sessionManager = deps.sessionManager;
    this.emit = deps.emit;
    this.emitError = deps.emitError;
    this.attachSessionHandlers = deps.attachSessionHandlers;
    this.getMaxSessionCount = deps.getMaxSessionCount;
  }

  handleNewRTCSession(e: RTCSessionEvent) {
    const session = e.session;
    const sessionId = String(
      (session as any)?.id ?? crypto.randomUUID?.() ?? Date.now()
    );

    const currentSessions = this.state.getState().sessions;
    if (currentSessions.length >= this.getMaxSessionCount()) {
      try {
        session.terminate?.({
          status_code: 486,
          reason_phrase: "Busy Here",
        } as any);
      } catch {
        /* ignore termination errors */
      }
      if (e.originator === "remote") {
        this.emit("missed", e);
      } else {
        this.emitError(
          "max session count reached",
          "MAX_SESSIONS_REACHED",
          "max session count reached"
        );
      }
      return;
    }

    const rtc = this.sessionManager.getOrCreateRtc(sessionId, session);
    this.sessionManager.setSession(sessionId, session);
    this.attachSessionHandlers(sessionId, session);

    if (e.originator === "local" && !rtc.mediaStream) {
      const maxAttempts = 5;
      const retryDelayMs = 500;
      let attempts = 0;
      let retryScheduled = false;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let stopped = false;

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
        if (!audioTrack) return false;
        const outgoingStream = new MediaStream([audioTrack]);
        this.sessionManager.setSessionMedia(sessionId, outgoingStream);
        return true;
      };

      const scheduleRetry = (pc?: RTCPeerConnection | null) => {
        if (stopped || retryScheduled || attempts >= maxAttempts) {
          session.off?.("peerconnection", onPeer);
          return;
        }
        retryScheduled = true;
        attempts += 1;
        retryTimer = setTimeout(() => {
          retryScheduled = false;
          retryTimer = null;
          if (tryBindFromPc(pc)) {
            session.off?.("peerconnection", onPeer);
            return;
          }
          scheduleRetry(pc);
        }, retryDelayMs);
      };

      const onPeer = (data: { peerconnection: RTCPeerConnection }) => {
        if (stopped) return;
        if (tryBindFromPc(data.peerconnection)) {
          session.off?.("peerconnection", onPeer);
          return;
        }
        scheduleRetry(data.peerconnection);
      };

      const stopRetry = () => {
        if (stopped) return;
        stopped = true;
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        session.off?.("peerconnection", onPeer);
        session.off?.("ended", stopRetry);
        session.off?.("failed", stopRetry);
      };

      const existingPc = (session as RTCSession & {
        connection?: RTCPeerConnection;
      })?.connection;
      if (!tryBindFromPc(existingPc)) {
        if (existingPc) scheduleRetry(existingPc);
        session.on?.("peerconnection", onPeer);
      }
      session.on?.("ended", stopRetry);
      session.on?.("failed", stopRetry);
    }

    holdOtherSessions(this.state, sessionId, (id) => {
      const otherRtc = this.sessionManager.getRtc(id);
      otherRtc?.hold();
    });

    const sdpHasVideo =
      (e.request?.body && e.request.body.toString().includes("m=video")) ||
      (session as RTCSession & { connection?: RTCPeerConnection })?.connection
        ?.getReceivers?.()
        ?.some((r: RTCRtpReceiver) => r.track?.kind === "video");

    upsertSessionState(this.state, sessionId, {
      direction: e.originator,
      from: e.originator === "remote" ? e.request.from.uri.user : null,
      to: e.request.to.uri.user,
      status:
        e.originator === "remote" ? CallStatus.Ringing : CallStatus.Dialing,
      mediaKind: sdpHasVideo ? "video" : "audio",
      remoteVideoEnabled: sdpHasVideo,
    });

    this.emit("newRTCSession", e);
  }
}
