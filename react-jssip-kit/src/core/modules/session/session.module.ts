import type { SipStateStore } from "../state/sip.state.store";
import { CallStatus } from "../../contracts/state";
import type { EventTargetEmitter } from "../event/event-target.emitter";
import type {
  AnswerOptions,
  DTMFOptions,
  ExtraHeaders,
  JsSIPEventMap,
  RenegotiateOptions,
  ReferOptions,
  RTCSession,
  RTCSessionEvent,
  RTCSessionEventMap,
  TerminateOptions,
} from "../../sip/types";
import { createSessionHandlers } from "./session.handlers";
import { SessionManager } from "./session.manager";
import { removeSessionState } from "./session.state.projector";
import { SessionLifecycle } from "./session.lifecycle";
import { MicRecoveryManager } from "../media/mic-recovery.manager";

type SessionModuleDeps = {
  state: SipStateStore;
  emitter: EventTargetEmitter<JsSIPEventMap>;
  sessionManager: SessionManager;
  micRecovery: MicRecoveryManager;
  getMaxSessionCount: () => number;
  getIceCandidateReadyDelayMs: () => number | undefined;
};

export class SessionModule {
  private sessionHandlers = new Map<string, Partial<RTCSessionEventMap>>();
  private lifecycle: SessionLifecycle;

  constructor(private readonly deps: SessionModuleDeps) {
    this.lifecycle = new SessionLifecycle({
      state: deps.state,
      sessionManager: deps.sessionManager,
      emit: (event, payload) => deps.emitter.emit(event as any, payload as any),
      attachSessionHandlers: (sessionId, session) =>
        this.attachSessionHandlers(sessionId, session),
      getMaxSessionCount: deps.getMaxSessionCount,
    });
  }

  setDebugEnabled(enabled: boolean) {
    this.lifecycle.setDebugEnabled(enabled);
  }

  handleNewRTCSession(e: RTCSessionEvent) {
    this.lifecycle.handleNewRTCSession(e);
  }

  setSessionMedia(sessionId: string, stream: MediaStream) {
    this.deps.sessionManager.setSessionMedia(sessionId, stream);
  }

  setSession(sessionId: string, session: RTCSession) {
    this.deps.sessionManager.setSession(sessionId, session);
  }

  answerSession(sessionId: string, options: AnswerOptions = {}) {
    if (!sessionId || !this.sessionExists(sessionId)) return false;
    return this.deps.sessionManager.answer(sessionId, options);
  }

  hangupSession(sessionId: string, options?: TerminateOptions) {
    if (!sessionId || !this.sessionExists(sessionId)) return false;
    return this.deps.sessionManager.hangup(sessionId, options);
  }

  hangupAll(options?: TerminateOptions) {
    const ids = this.getSessionIds();
    ids.forEach((id) => this.hangupSession(id, options));
    return ids.length > 0;
  }

  toggleMuteSession(sessionId?: string) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.deps.state.getState().sessionsById[resolved];
    const muted = sessionState?.muted ?? false;
    if (muted) {
      this.deps.sessionManager.unmute(resolved);
      return true;
    }
    this.deps.sessionManager.mute(resolved);
    return true;
  }

  toggleHoldSession(sessionId?: string) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.deps.state.getState().sessionsById[resolved];
    const isOnHold = sessionState?.status === CallStatus.Hold;
    if (isOnHold) {
      this.deps.sessionManager.unhold(resolved);
      return true;
    }
    if (sessionState?.status === CallStatus.Active) {
      this.deps.sessionManager.hold(resolved);
      return true;
    }
    return false;
  }

  sendDTMFSession(
    sessionId: string,
    tones: string | number,
    options?: DTMFOptions
  ) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.deps.state.getState().sessionsById[resolved];
    if (sessionState?.status === CallStatus.Active) {
      this.deps.sessionManager.sendDTMF(resolved, tones, options);
      return true;
    }
    return false;
  }

  transferSession(sessionId: string, target: string, options?: ReferOptions) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.deps.state.getState().sessionsById[resolved];
    if (sessionState?.status === CallStatus.Active) {
      this.deps.sessionManager.transfer(resolved, target, options);
      return true;
    }
    return false;
  }

  sendInfoSession(
    sessionId: string,
    contentType: string,
    body?: string,
    options?: ExtraHeaders
  ) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.deps.state.getState().sessionsById[resolved];
    if (
      sessionState?.status !== CallStatus.Active &&
      sessionState?.status !== CallStatus.Hold
    ) {
      return false;
    }
    const session = this.deps.sessionManager.getSession(resolved);
    if (!session) return false;
    session.sendInfo(contentType, body, options);
    return true;
  }

  updateSession(sessionId: string, options?: RenegotiateOptions) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.deps.state.getState().sessionsById[resolved];
    if (
      sessionState?.status !== CallStatus.Active &&
      sessionState?.status !== CallStatus.Hold
    ) {
      return false;
    }
    const session = this.deps.sessionManager.getSession(resolved);
    if (!session) return false;
    return session.renegotiate(options);
  }

  getSession(sessionId: string) {
    return this.deps.sessionManager.getSession(sessionId);
  }

  getSessionIds() {
    return this.deps.sessionManager.getSessionIds();
  }

  getSessions() {
    return this.deps.sessionManager.getSessions();
  }

  cleanupAllSessions() {
    this.deps.sessionManager.cleanupAllSessions();
    this.deps.micRecovery.cleanupAll();
    this.sessionHandlers.clear();
    this.deps.state.setState({
      sessions: [],
      sessionsById: {},
      sessionIds: [],
      error: null,
    });
  }

  private attachSessionHandlers(sessionId: string, session: RTCSession) {
    const handlers = this.createSessionHandlersFor(sessionId, session);
    this.sessionHandlers.set(sessionId, handlers);

    (Object.keys(handlers) as (keyof RTCSessionEventMap)[]).forEach((ev) => {
      const h = handlers[ev];
      if (h) session.on(ev, h as any);
    });
  }

  private detachSessionHandlers(sessionId: string, session: RTCSession) {
    const handlers = this.sessionHandlers.get(sessionId);
    if (!handlers || !session) return;
    (Object.keys(handlers) as (keyof RTCSessionEventMap)[]).forEach((ev) => {
      const h = handlers[ev];
      if (h) session.off(ev, h as any);
    });
    this.sessionHandlers.delete(sessionId);
  }

  private cleanupSession(sessionId: string, session?: RTCSession) {
    const targetSession =
      session ??
      this.deps.sessionManager.getSession(sessionId) ??
      this.deps.sessionManager.getRtc(sessionId)?.currentSession;
    this.detachSessionHandlers(sessionId, targetSession as any);
    this.deps.micRecovery.disable(sessionId);
    this.deps.sessionManager.cleanupSession(sessionId);
    removeSessionState(this.deps.state, sessionId);
  }

  private createSessionHandlersFor(
    sessionId: string,
    session: RTCSession
  ): Partial<RTCSessionEventMap> {
    const rtc = this.deps.sessionManager.getOrCreateRtc(sessionId, session);
    return createSessionHandlers({
      emitter: this.deps.emitter,
      state: this.deps.state,
      rtc,
      detachSessionHandlers: () => this.cleanupSession(sessionId, session),
      enableMicrophoneRecovery: (confirmedSessionId) =>
        this.deps.micRecovery.enable(confirmedSessionId),
      iceCandidateReadyDelayMs: this.deps.getIceCandidateReadyDelayMs(),
      sessionId,
    });
  }

  private resolveSessionId(sessionId?: string) {
    if (sessionId) return sessionId;
    const state = this.deps.state.getState();
    const activeId = state.sessionIds.find(
      (id) => state.sessionsById[id]?.status === CallStatus.Active
    );
    return activeId ?? state.sessionIds[0] ?? null;
  }

  private sessionExists(sessionId: string) {
    return (
      !!this.deps.sessionManager.getSession(sessionId) ||
      !!this.deps.sessionManager.getRtc(sessionId)
    );
  }

  private resolveExistingSessionId(sessionId?: string) {
    const id = this.resolveSessionId(sessionId);
    if (!id) return null;
    return this.sessionExists(id) ? id : null;
  }
}
