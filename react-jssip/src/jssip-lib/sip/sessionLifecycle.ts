import { SipStateStore } from "../core/sipStateStore";
import { CallDirection, CallStatus } from "../core/types";
import type { RTCSession, RTCSessionEvent } from "./types";
import { SessionManager } from "./sessionManager";
import { holdOtherSessions, upsertSessionState } from "./sessionState";
import type { JsSIPEventName } from "./types";
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
    const sessionId = String((session as any)?.id ?? crypto.randomUUID?.() ?? Date.now());

    const currentSessions = this.state.getState().sessions;
    if (currentSessions.length >= this.getMaxSessionCount()) {
      try {
        session.terminate?.({ status_code: 486, reason_phrase: "Busy Here" } as any);
      } catch {
        /* ignore termination errors */
      }
      if (e.originator === "remote") {
        this.emit("missed", { sessionId, data: e });
      }
      this.emitError("max session count reached", "MAX_SESSIONS_REACHED", "max session count reached");
      return;
    }

    const outgoingMedia = e.originator === "local" ? this.sessionManager.dequeueOutgoingMedia() : null;

    if (outgoingMedia) this.sessionManager.setSessionMedia(sessionId, outgoingMedia);

    const rtc = this.sessionManager.getOrCreateRtc(sessionId, session);
    if (outgoingMedia) rtc.setMediaStream(outgoingMedia);

    this.sessionManager.setSession(sessionId, session);
    this.attachSessionHandlers(sessionId, session);

    holdOtherSessions(
      this.state,
      sessionId,
      (id) => {
        const otherRtc = this.sessionManager.getRtc(id);
        otherRtc?.hold();
      },
      (id, partial) => upsertSessionState(this.state, id, partial)
    );

    const sdpHasVideo =
      (e.request?.body && e.request.body.toString().includes("m=video")) ||
      (session as RTCSession & { connection?: RTCPeerConnection })?.connection
        ?.getReceivers?.()
        ?.some((r: RTCRtpReceiver) => r.track?.kind === "video");

    upsertSessionState(this.state, sessionId, {
      direction: e.originator === "remote" ? CallDirection.Incoming : CallDirection.Outgoing,
      from: e.originator === "remote" ? e.request.from.uri.user : null,
      to: e.request.to.uri.user,
      status: e.originator === "remote" ? CallStatus.Ringing : CallStatus.Dialing,
      mediaKind: sdpHasVideo ? "video" : "audio",
      remoteVideoEnabled: sdpHasVideo,
    });

    this.emit("newRTCSession", { sessionId, data: e });
  }
}
