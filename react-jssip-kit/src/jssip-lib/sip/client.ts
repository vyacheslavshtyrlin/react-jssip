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

import { SipState, SipStatus, CallStatus } from "../core/types";
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
import { removeSessionState } from "./sessionState";
import { SessionLifecycle } from "./sessionLifecycle";

type SipClientOptions = {
  errorMessages?: Record<string, string>;
  formatError?: SipErrorFormatter;
  errorHandler?: SipErrorHandler;
  debug?: boolean | string;
};

const SESSION_DEBUG_KEY = "sip-debug-enabled";

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
  private unloadHandler?: () => void;
  private stateLogOff?: () => void;

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
      attachSessionHandlers: (sessionId, session) =>
        this.attachSessionHandlers(sessionId, session),
      getMaxSessionCount: () => this.maxSessionCount,
    });

    if (typeof window !== "undefined") {
      // Let window.sipSupport trigger client debug toggles.
      (window as any).sipDebugBridge = (debug?: boolean | string) =>
        this.setDebug(debug ?? true);
    }
  }

  public connect(uri: string, password: string, config: SipConfiguration) {
    this.disconnect();
    this.stateStore.setState({ sipStatus: SipStatus.Connecting });
    const {
      debug: cfgDebug,
      maxSessionCount,
      pendingMediaTtlMs,
      ...uaCfg
    } = config;
    this.maxSessionCount =
      typeof maxSessionCount === "number" ? maxSessionCount : Infinity;
    this.sessionManager.setPendingMediaTtl(pendingMediaTtlMs);
    // Config debug has priority, then persisted session flag, then prior setting.
    const debug = cfgDebug ?? this.getPersistedDebug() ?? this.debugPattern;
    this.userAgent.start(uri, password, uaCfg, { debug });
    this.attachUAHandlers();
    this.attachBeforeUnload();
    this.syncDebugInspector(debug);
  }

  public registerUA() {
    this.userAgent.register();
  }

  public disconnect() {
    this.detachBeforeUnload();
    this.detachUAHandlers();
    this.userAgent.stop();
    this.cleanupAllSessions();
    this.stateStore.reset();
  }

  public call(target: string, callOptions: CallOptions = {}) {
    try {
      const opts = this.ensureMediaConstraints(callOptions);
      if (opts.mediaStream)
        this.sessionManager.enqueueOutgoingMedia(opts.mediaStream);

      const ua = this.userAgent.getUA();
      ua?.call(target, opts);
    } catch (e: unknown) {
      const err = this.emitError(e, "CALL_FAILED", "call failed");
      this.cleanupAllSessions();
      this.stateStore.batchSet({
        error: err.cause,
      });
    }
  }

  public answer(sessionId: string, options: AnswerOptions = {}) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    return this.answerSession(resolved, options);
  }
  public hangup(sessionId: string, options?: TerminateOptions) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    return this.hangupSession(resolved, options);
  }

  public hangupAll(options?: TerminateOptions) {
    const ids = this.getSessionIds();
    ids.forEach((id) => this.hangupSession(id, options));
    return ids.length > 0;
  }

  public toggleMute(sessionId: string) {
    return this.toggleMuteSession(sessionId);
  }
  public toggleHold(sessionId: string) {
    return this.toggleHoldSession(sessionId);
  }
  public sendDTMF(
    sessionId: string,
    tones: string | number,
    options?: DTFMOptions
  ) {
    return this.sendDTMFSession(sessionId, tones, options);
  }
  public transfer(
    sessionId: string,
    target: string | RTCSession,
    options?: ReferOptions
  ) {
    return this.transferSession(sessionId, target, options);
  }
  public attendedTransfer(
    sessionId: string,
    otherSession: RTCSession
  ) {
    return this.attendedTransferSession(sessionId, otherSession);
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
    this.syncDebugInspector(debug);
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
      onSessionFailed: (err?: string, event?: RTCSessionEvent) =>
        this.onSessionFailed(err, event),
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
      (statusCode
        ? `${statusCode}${statusText ? " " + statusText : ""}`
        : "call failed");
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

  private sessionExists(sessionId: string) {
    return (
      !!this.sessionManager.getSession(sessionId) ||
      !!this.sessionManager.getRtc(sessionId)
    );
  }

  private resolveExistingSessionId(sessionId?: string) {
    const id = this.resolveSessionId(sessionId);
    if (!id) return null;
    return this.sessionExists(id) ? id : null;
  }

  private ensureMediaConstraints<
    T extends {
      mediaStream?: MediaStream;
      mediaConstraints?: MediaStreamConstraints;
    }
  >(opts: T): T {
    if (opts.mediaStream || opts.mediaConstraints) return opts;
    return { ...opts, mediaConstraints: { audio: true, video: false } } as T;
  }

  public answerSession(sessionId: string, options: AnswerOptions = {}) {
    if (!sessionId || !this.sessionExists(sessionId)) return false;
    const opts = this.ensureMediaConstraints(options);
    return this.sessionManager.answer(sessionId, opts);
  }

  public hangupSession(sessionId: string, options?: TerminateOptions) {
    if (!sessionId || !this.sessionExists(sessionId)) return false;
    return this.sessionManager.hangup(sessionId, options);
  }

  public toggleMuteSession(sessionId?: string) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    const muted = sessionState?.muted ?? false;
    if (muted) {
      this.sessionManager.unmute(resolved);
      return true;
    }
    this.sessionManager.mute(resolved);
    return true;
  }

  public toggleHoldSession(sessionId?: string) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    const isOnHold = sessionState?.status === CallStatus.Hold;
    if (isOnHold) {
      this.sessionManager.unhold(resolved);
      return true;
    }
    if (sessionState?.status === CallStatus.Active) {
      this.sessionManager.hold(resolved);
      return true;
    }
    return true;
  }

  public sendDTMFSession(
    sessionId: string,
    tones: string | number,
    options?: DTFMOptions
  ) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Active)
      this.sessionManager.sendDTMF(resolved, tones, options);
    return true;
  }

  public transferSession(
    sessionId: string,
    target: string | RTCSession,
    options?: ReferOptions
  ) {
    const resolved = this.resolveExistingSessionId(sessionId);
    if (!resolved) return false;
    const sessionState = this.stateStore
      .getState()
      .sessions.find((s) => s.id === resolved);
    if (sessionState?.status === CallStatus.Active)
      this.sessionManager.transfer(resolved, target, options);
    return true;
  }

  public attendedTransferSession(
    sessionId: string,
    otherSession: RTCSession
  ) {
    const resolved = this.resolveExistingSessionId(sessionId);
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
    if (!this.sessionExists(sessionId)) return false;
    const rtc = this.sessionManager.getRtc(sessionId);
    return rtc ? rtc.switchCamera(track) : false;
  }

  public enableVideoSession(sessionId: string) {
    if (!this.sessionExists(sessionId)) return false;
    const rtc = this.sessionManager.getRtc(sessionId);
    rtc?.enableVideo();
    return !!rtc;
  }

  public disableVideoSession(sessionId: string) {
    if (!this.sessionExists(sessionId)) return false;
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

  private attachBeforeUnload() {
    if (typeof window === "undefined" || this.unloadHandler) return;

    const handler = () => {
      this.hangupAll();
      this.disconnect();
    };

    window.addEventListener("beforeunload", handler);
    this.unloadHandler = handler;
  }

  private detachBeforeUnload() {
    if (typeof window === "undefined" || !this.unloadHandler) return;
    window.removeEventListener("beforeunload", this.unloadHandler);
    this.unloadHandler = undefined;
  }

  private syncDebugInspector(debug?: boolean | string) {
    if (typeof window === "undefined") return;
    this.toggleStateLogger(Boolean(debug));

    const win = window as any;
    const disabledInspector = () => {
      console.warn("SIP debug inspector disabled; enable debug to inspect.");
      return null;
    };
    win.sipState = () =>
      debug ? this.stateStore.getState() : disabledInspector();
    win.sipSessions = () =>
      debug ? this.getSessions() : disabledInspector();
  }

  private toggleStateLogger(enabled: boolean) {
    if (!enabled) {
      this.stateLogOff?.();
      this.stateLogOff = undefined;
      return;
    }
    if (this.stateLogOff) return;

    let prev = this.stateStore.getState();
    // Emit initial snapshot right away for visibility.
    console.info("[sip][state]", { initial: true }, prev);

    this.stateLogOff = this.stateStore.onChange((next) => {
      const changes = this.diffState(prev, next);
      if (changes) {
        // Log concise diff and the current snapshot for quick inspection.
        console.info("[sip][state]", changes, next);
      }
      prev = next;
    });
  }

  private diffState(
    prev: SipState,
    next: SipState
  ): Record<string, { from: unknown; to: unknown }> | null {
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(next) as Array<keyof SipState>) {
      if (prev[key] !== next[key]) {
        changed[key as string] = { from: prev[key], to: next[key] };
      }
    }
    return Object.keys(changed).length ? changed : null;
  }

  private getPersistedDebug(): boolean | string | undefined {
    if (typeof window === "undefined") return undefined;
    try {
      const persisted = window.sessionStorage.getItem(SESSION_DEBUG_KEY);
      if (!persisted) return undefined;
      if (persisted === "true") return true;
      return persisted;
    } catch {
      return undefined;
    }
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
