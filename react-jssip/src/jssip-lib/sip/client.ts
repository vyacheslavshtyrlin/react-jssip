import { SipUserAgent } from "./userAgent";
import {
  AnswerOptions,
  CallOptions,
  DTFMOptions,
  JsSIPEventMap,
  JsSIPEventName,
  ReferOptions,
  RTCSession,
  RTCSessionEvent,
  RTCSessionEventMap,
  SipConfiguration,
  SipEventHandlers,
  SipEventManager,
  TerminateOptions,
  UAEventMap,
} from "./types";

import {
  SipState,
  SipStatus,
  CallStatus,
} from "../core/types";
import { EventTargetEmitter } from "../core/eventEmitter";
import {
  SipErrorHandler,
  SipErrorFormatter,
  SipErrorPayload,
} from "../core/sipErrorHandler";
import { SipStateStore } from "../core/sipStateStore";
import { createUAHandlers } from "./handlers/uaHandlers";
import { createSessionHandlers } from "./handlers/sessionHandlers";
import { SessionManager } from "./sessionManager";
import { holdOtherSessions, upsertSessionState, removeSessionState } from "./sessionState";
import { SessionLifecycle } from "./sessionLifecycle";

type SipClientOptions = {
  errorMessages?: Record<string, string>;
  formatError?: SipErrorFormatter;
  errorHandler?: SipErrorHandler;
  debug?: boolean | string;
};

export class SipClient extends EventTargetEmitter<JsSIPEventMap> {
  public readonly userAgent = new SipUserAgent();
  public readonly stateStore = new SipStateStore();

  private readonly uaHandlers: Partial<UAEventMap>;
  private readonly uaHandlerKeys: (keyof UAEventMap)[];
  private sessionHandlers = new Map<string, Partial<RTCSessionEventMap>>();
  private readonly errorHandler: SipErrorHandler;
  private debugPattern?: boolean | string;
  private maxSessionCount = Infinity;
  private sessionManager = new SessionManager();
  private lifecycle: SessionLifecycle;

  public get state(): SipState {
    return this.stateStore.getState();
  }

  constructor(options: SipClientOptions = {}) {
    super();

    this.errorHandler =
      options.errorHandler ??
      new SipErrorHandler({
        formatter: options.formatError,
        messages: options.errorMessages,
      });
    this.debugPattern = options.debug;

    this.uaHandlers = createUAHandlers({
      emitter: this,
      state: this.stateStore,
      cleanupAllSessions: () => this.cleanupAllSessions(),
      emitError: (raw, code, fallback) => this.emitError(raw, code, fallback),
      onNewRTCSession: (e: RTCSessionEvent) => this.onNewRTCSession(e),
    });
    this.uaHandlerKeys = Object.keys(this.uaHandlers) as (keyof UAEventMap)[];
    this.lifecycle = new SessionLifecycle({
      state: this.stateStore,
      sessionManager: this.sessionManager,
      emit: (event, payload) => this.emit(event as any, payload as any),
      emitError: (raw, code, fallback) => this.emitError(raw, code, fallback),
      attachSessionHandlers: (sessionId, session) => this.attachSessionHandlers(sessionId, session),
      getMaxSessionCount: () => this.maxSessionCount,
    });
  }

  public connect(uri: string, password: string, config: SipConfiguration) {
    this.disconnect();
    this.stateStore.setState({ sipStatus: SipStatus.Connecting });
    const { debug: cfgDebug, maxSessionCount, pendingMediaTtlMs, ...uaCfg } = config;
    this.maxSessionCount =
      typeof maxSessionCount === "number" ? maxSessionCount : Infinity;
    this.sessionManager.setPendingMediaTtl(pendingMediaTtlMs);
    const debug = this.debugPattern ?? cfgDebug;
    this.userAgent.start(uri, password, uaCfg, { debug });
    this.attachUAHandlers();
  }

  public registerUA() {
    this.userAgent.register();
  }

  public disconnect() {
    this.detachUAHandlers();
    this.userAgent.stop();
    this.cleanupAllSessions();
    this.stateStore.reset();
  }

  public call(target: string, callOptions: CallOptions = {}) {
    try {
      if (callOptions.mediaStream)
        this.sessionManager.enqueueOutgoingMedia(callOptions.mediaStream);

      const ua = this.userAgent.getUA();
      ua?.call(target, callOptions);
    } catch (e: unknown) {
      const err = this.emitError(e, "CALL_FAILED", "call failed");
      this.cleanupAllSessions();
      this.stateStore.batchSet({
        error: err.cause,
      });
    }
  }

  public answer(options: AnswerOptions = {}) {
    return this.answerSession(undefined, options);
  }
  public hangup(options?: TerminateOptions) {
    return this.hangupSession(undefined, options);
  }
  public mute() {
    return this.muteSession();
  }
  public unmute() {
    return this.unmuteSession();
  }
  public hold() {
    return this.holdSession();
  }
  public unhold() {
    return this.unholdSession();
  }
  public sendDTMF(tones: string | number, options?: DTFMOptions) {
    const sessionId = this.resolveSessionId();
    return this.sendDTMFSession(tones, options, sessionId ?? undefined);
  }
  public transfer(target: string | RTCSession, options?: ReferOptions) {
    return this.transferSession(target, options);
  }
  public attendedTransfer(otherSession: RTCSession) {
    return this.attendedTransferSession(otherSession);
  }

  public onChange(fn: (s: SipState) => void) {
    return this.stateStore.onChange(fn);
  }

  private attachUAHandlers() {
    const ua = this.userAgent.ua;
    if (!ua) return;

    this.detachUAHandlers();
    this.uaHandlerKeys.forEach((ev) => {
      const h = this.uaHandlers[ev];
      if (h) ua.on(ev, h as any);
    });
  }

  public setDebug(debug?: boolean | string) {
    this.debugPattern = debug;
    this.userAgent.setDebug(debug);
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

  private detachUAHandlers() {
    const ua = this.userAgent.ua;
    if (!ua) return;
    this.uaHandlerKeys.forEach((ev) => {
      const h = this.uaHandlers[ev];
      if (h) ua.off(ev, h as any);
    });
  }

  private cleanupSession(sessionId: string, session?: RTCSession) {
    const existingSession = this.sessionManager.getSession(sessionId);
    this.emit("sessionCleanup", { sessionId, session: existingSession });
    const targetSession =
      session ??
      this.sessionManager.getSession(sessionId) ??
      this.sessionManager.getRtc(sessionId)?.currentSession;
    this.detachSessionHandlers(sessionId, targetSession as any);
    this.sessionManager.cleanupSession(sessionId);
    removeSessionState(this.stateStore, sessionId);
  }

  private cleanupAllSessions() {
    const ids = this.sessionManager.getSessionIds();
    ids.forEach((id) => {
      const s = this.sessionManager.getSession(id);
      this.emit("sessionCleanup", { sessionId: id, session: s });
    });
    this.sessionManager.cleanupAllSessions();
    this.sessionHandlers.clear();
    this.stateStore.setState({
      sessions: [],
      error: null,
    });
  }

  private createSessionHandlersFor(
    sessionId: string,
    session: RTCSession
  ): Partial<RTCSessionEventMap> {
    const rtc = this.sessionManager.getOrCreateRtc(sessionId, session);
    return createSessionHandlers({
      emitter: this,
      state: this.stateStore,
      rtc,
      detachSessionHandlers: () => this.cleanupSession(sessionId, session),
      emitError: (raw, code, fallback) => this.emitError(raw, code, fallback),
      onSessionFailed: (err?: string, event?: RTCSessionEvent) => this.onSessionFailed(err, event),
      sessionId,
    });
  }

  protected onNewRTCSession(e: RTCSessionEvent) {
    this.lifecycle.handleNewRTCSession(e);
  }

  protected onSessionFailed(error?: string, event?: RTCSessionEvent) {
    const rawCause = (event as any)?.cause ?? error;
    const statusCode = (event as any)?.message?.status_code;
    const statusText = (event as any)?.message?.reason_phrase;
    const causeText =
      rawCause ||
      (statusCode ? `${statusCode}${statusText ? " " + statusText : ""}` : "call failed");
    this.emitError(
      { raw: event, cause: rawCause, statusCode, statusText },
      "SESSION_FAILED",
      causeText
    );
  }

  private emitError(
    raw: unknown,
    code?: string,
    fallback?: string
  ): SipErrorPayload {
    const payload = this.errorHandler.format({ raw, code, fallback });
    this.emit("error", payload);
    return payload;
  }

  private resolveSessionId(sessionId?: string) {
    if (sessionId) return sessionId;
    const sessions = this.stateStore.getState().sessions;
    const active = sessions.find((s) => s.status === CallStatus.Active);
    return active?.id ?? sessions[0]?.id ?? null;
  }

  public answerSession(
    sessionIdOrOptions?: string | AnswerOptions,
    options?: AnswerOptions
  ) {
    const sessionId =
      typeof sessionIdOrOptions === "string"
        ? sessionIdOrOptions
        : this.resolveSessionId();
    const opts =
      typeof sessionIdOrOptions === "string"
        ? options ?? {}
        : (sessionIdOrOptions as AnswerOptions) ?? {};
    if (!sessionId) return false;
    holdOtherSessions(
      this.stateStore,
      sessionId,
      (id) => {
        const rtc = this.sessionManager.getRtc(id);
        rtc?.hold();
      },
      (id, partial) => upsertSessionState(this.stateStore, id, partial)
    );
    return this.sessionManager.answer(sessionId, opts);
  }

  public hangupSession(
    sessionIdOrOptions?: string | TerminateOptions,
    options?: TerminateOptions
  ) {
    const sessionId =
      typeof sessionIdOrOptions === "string"
        ? sessionIdOrOptions
        : this.resolveSessionId();
    const opts =
      typeof sessionIdOrOptions === "string"
        ? options
        : (sessionIdOrOptions as TerminateOptions | undefined);
    if (!sessionId) return false;
    return this.sessionManager.hangup(sessionId, opts);
  }

  public muteSession(sessionId?: string) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.muted) return true;
    this.sessionManager.mute(resolved);
    upsertSessionState(this.stateStore, resolved, { muted: true });
    return true;
  }

  public unmuteSession(sessionId?: string) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (!sessionState?.muted) return true;
    this.sessionManager.unmute(resolved);
    upsertSessionState(this.stateStore, resolved, { muted: false });
    return true;
  }

  public holdSession(sessionId?: string) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Active) {
      this.sessionManager.hold(resolved);
      upsertSessionState(this.stateStore, resolved, { status: CallStatus.Hold });
    }
    return true;
  }

  public unholdSession(sessionId?: string) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Hold) {
      this.sessionManager.unhold(resolved);
      upsertSessionState(this.stateStore, resolved, {
        status: CallStatus.Active,
      });
    }
    return true;
  }

  public sendDTMFSession(
    tones: string | number,
    options?: DTFMOptions,
    sessionId?: string
  ) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Active)
      this.sessionManager.sendDTMF(resolved, tones, options);
    return true;
  }

  public transferSession(
    target: string | RTCSession,
    options?: ReferOptions,
    sessionId?: string
  ) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Active)
      this.sessionManager.transfer(resolved, target, options);
    return true;
  }

  public attendedTransferSession(otherSession: RTCSession, sessionId?: string) {
    const resolved = this.resolveSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Active)
      this.sessionManager.attendedTransfer(resolved, otherSession);
    return true;
  }

  public setSessionMedia(sessionId: string, stream: MediaStream) {
    this.sessionManager.setSessionMedia(sessionId, stream);
  }

  public switchCameraSession(sessionId: string, track: MediaStreamTrack) {
    const rtc = this.sessionManager.getRtc(sessionId);
    return rtc ? rtc.switchCamera(track) : false;
  }

  public startScreenShareSession(
    sessionId: string,
    getDisplayMedia: () => Promise<MediaStream>
  ) {
    return this.sessionManager.startScreenShare(sessionId, getDisplayMedia);
  }


  public enableVideoSession(sessionId: string) {
    const rtc = this.sessionManager.getRtc(sessionId);
    rtc?.enableVideo();
    return !!rtc;
  }

  public disableVideoSession(sessionId: string) {
    const rtc = this.sessionManager.getRtc(sessionId);
    rtc?.disableVideo();
    return !!rtc;
  }

  public getSession(sessionId: string) {
    return this.sessionManager.getSession(sessionId);
  }

  public getSessionIds() {
    return this.sessionManager.getSessionIds();
  }

  public getSessions() {
    return this.sessionManager.getSessions();
  }
}

export function createSipClientInstance(options?: SipClientOptions): SipClient {
  return new SipClient(options);
}

export function createSipEventManager(client: SipClient): SipEventManager {
  return {
    on(event, handler) {
      return client.on(event, handler as any);
    },
    onSession(sessionId, event, handler) {
      return client.on(event, (payload: any) => {
        if (
          payload &&
          "sessionId" in payload &&
          payload.sessionId === sessionId
        ) {
          handler(payload);
        }
      });
    },
    bind(handlers: Partial<SipEventHandlers>) {
      const offs: Array<() => void> = [];

      (Object.keys(handlers) as JsSIPEventName[]).forEach((event) => {
        const handler = handlers[event];
        if (handler) {
          offs.push(client.on(event, handler as any));
        }
      });

      return () => offs.forEach((off) => off());
    },
    bindSession(sessionId, handlers: Partial<SipEventHandlers>) {
      const offs: Array<() => void> = [];

      (Object.keys(handlers) as JsSIPEventName[]).forEach((event) => {
        const handler = handlers[event];
        if (handler) {
          offs.push(
            client.on(event, (payload: any) => {
              if (
                payload &&
                "sessionId" in payload &&
                payload.sessionId === sessionId
              ) {
                handler(payload);
              }
            })
          );
        }
      });

      return () => offs.forEach((off) => off());
    },
  };
}
