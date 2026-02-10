import { SipUserAgent } from "../sip/user-agent";
import {
  AnswerOptions,
  CallOptions,
  DTMFOptions,
  ExtraHeaders,
  JsSIPEventMap,
  RenegotiateOptions,
  ReferOptions,
  RTCSession,
  RTCSessionEvent,
  SendMessageOptions,
  SipConfiguration,
  SipSendOptionsOptions,
  TerminateOptions,
} from "../sip/types";
import { SipState, SipStatus } from "../contracts/state";
import { EventTargetEmitter } from "../modules/event/event-target.emitter";
import { SipStateStore } from "../modules/state/sip.state.store";
import { SipDebugRuntime } from "../modules/debug/sip-debug.runtime";
import { createSipEventManager } from "../modules/event/sip-event-manager.adapter";
import { MicRecoveryManager } from "../modules/media/mic-recovery.manager";
import { BrowserUnloadRuntime } from "../modules/runtime/browser-unload.runtime";
import { SessionManager } from "../modules/session/session.manager";
import { SessionModule } from "../modules/session/session.module";
import { createUAHandlers } from "../modules/ua/ua.handlers";
import { UaModule } from "../modules/ua/ua.module";

export type SipClientOptions = {
  debug?: boolean | string;
};

export class SipClient extends EventTargetEmitter<JsSIPEventMap> {
  public readonly userAgent = new SipUserAgent();
  public readonly stateStore = new SipStateStore();

  private readonly uaModule: UaModule;
  private debugPattern?: boolean | string;
  private maxSessionCount = Infinity;
  private iceCandidateReadyDelayMs?: number;
  private sessionManager = new SessionManager();
  private sessionModule: SessionModule;
  private micRecovery: MicRecoveryManager;
  private unloadRuntime = new BrowserUnloadRuntime();
  private debugRuntime: SipDebugRuntime;

  public get state(): SipState {
    return this.stateStore.getPublicState();
  }

  constructor(options: SipClientOptions = {}) {
    super();
    this.debugPattern = options.debug;

    this.uaModule = new UaModule({
      userAgent: this.userAgent,
      createHandlers: () =>
        createUAHandlers({
          emitter: this,
          state: this.stateStore,
          cleanupAllSessions: () => this.cleanupAllSessions(),
          onNewRTCSession: (e: RTCSessionEvent) => this.onNewRTCSession(e),
        }),
    });

    this.micRecovery = new MicRecoveryManager({
      getRtc: (sessionId) => this.sessionManager.getRtc(sessionId),
      getSession: (sessionId) => this.sessionManager.getSession(sessionId),
      getSessionState: (sessionId) =>
        this.stateStore.getState().sessionsById[sessionId],
      setSessionMedia: (sessionId, stream) =>
        this.sessionManager.setSessionMedia(sessionId, stream),
    });

    this.sessionModule = new SessionModule({
      state: this.stateStore,
      emitter: this,
      sessionManager: this.sessionManager,
      micRecovery: this.micRecovery,
      getMaxSessionCount: () => this.maxSessionCount,
      getIceCandidateReadyDelayMs: () => this.iceCandidateReadyDelayMs,
    });

    this.debugRuntime = new SipDebugRuntime({
      getState: () => this.stateStore.getPublicState(),
      onChange: (listener) => this.stateStore.onPublicChange(listener),
      getSessions: () => this.getSessions(),
      setDebugEnabled: (enabled) => this.sessionModule.setDebugEnabled(enabled),
    });

    this.debugRuntime.attachBridge((debug?: boolean | string) =>
      this.setDebug(debug)
    );
  }

  public connect(uri: string, password: string, config: SipConfiguration) {
    this.disconnect();
    this.stateStore.setState({ sipStatus: SipStatus.Connecting });
    const {
      debug: cfgDebug,
      enableMicRecovery,
      micRecoveryIntervalMs,
      micRecoveryMaxRetries,
      maxSessionCount,
      iceCandidateReadyDelayMs,
      ...uaCfg
    } = config;
    this.maxSessionCount =
      typeof maxSessionCount === "number" ? maxSessionCount : Infinity;
    this.iceCandidateReadyDelayMs =
      typeof iceCandidateReadyDelayMs === "number"
        ? iceCandidateReadyDelayMs
        : undefined;
    this.micRecovery.configure({
      enabled: Boolean(enableMicRecovery),
      intervalMs: micRecoveryIntervalMs,
      maxRetries: micRecoveryMaxRetries,
    });
    const debug =
      cfgDebug ?? this.debugRuntime.getPersistedDebug() ?? this.debugPattern;
    this.uaModule.start(uri, password, uaCfg, debug);
    this.sessionModule.setDebugEnabled(Boolean(debug));
    this.unloadRuntime.attach(() => {
      this.hangupAll();
      this.disconnect();
    });
    this.debugRuntime.syncInspector(debug);
  }

  public registerUA() {
    this.uaModule.register();
  }

  public disconnect() {
    this.unloadRuntime.detach();
    this.uaModule.stop();
    this.cleanupAllSessions();
    this.stateStore.reset();
    this.debugRuntime.cleanup();
  }

  public call(target: string, callOptions: CallOptions = {}) {
    try {
      const ua = this.userAgent.getUA();
      const session = ua?.call(target, callOptions) as RTCSession | undefined;
      if (session && callOptions.mediaStream) {
        const sessionId = String((session as any)?.id ?? "");
        if (sessionId) {
          this.sessionModule.setSessionMedia(sessionId, callOptions.mediaStream);
          this.sessionModule.setSession(sessionId, session);
        }
      }
    } catch (e: unknown) {
      console.error(e);
      this.cleanupAllSessions();
    }
  }

  public sendMessage(
    target: string,
    body: string,
    options?: SendMessageOptions
  ) {
    try {
      const ua = this.userAgent.getUA();
      if (!ua) return false;
      ua.sendMessage(target, body, options);
      return true;
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
  }

  public sendOptions(
    target: string,
    body?: string,
    options?: SipSendOptionsOptions
  ) {
    try {
      const ua = this.userAgent.getUA() as any;
      if (!ua || typeof ua.sendOptions !== "function") return false;
      ua.sendOptions(target, body, options);
      return true;
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
  }

  public hangupAll(options?: TerminateOptions) {
    const ids = this.getSessionIds();
    ids.forEach((id) => this.hangupSession(id, options));
    return ids.length > 0;
  }

  public onChange(fn: (s: SipState) => void) {
    return this.stateStore.onPublicChange(fn);
  }

  public setDebug(debug?: boolean | string) {
    this.debugPattern = debug;
    this.uaModule.setDebug(debug);
    this.sessionModule.setDebugEnabled(Boolean(debug));
    const effectiveDebug =
      debug ?? this.debugRuntime.getPersistedDebug() ?? this.debugPattern;
    this.debugRuntime.syncInspector(effectiveDebug);
  }

  private cleanupAllSessions() {
    this.sessionModule.cleanupAllSessions();
  }

  protected onNewRTCSession(e: RTCSessionEvent) {
    this.sessionModule.handleNewRTCSession(e);
  }

  public answerSession(sessionId: string, options: AnswerOptions = {}) {
    if (options.mediaStream) {
      this.sessionModule.setSessionMedia(sessionId, options.mediaStream);
    }
    return this.sessionModule.answerSession(sessionId, options);
  }

  public hangupSession(sessionId: string, options?: TerminateOptions) {
    return this.sessionModule.hangupSession(sessionId, options);
  }

  public toggleMuteSession(sessionId?: string) {
    return this.sessionModule.toggleMuteSession(sessionId);
  }

  public toggleHoldSession(sessionId?: string) {
    return this.sessionModule.toggleHoldSession(sessionId);
  }

  public sendDTMFSession(
    sessionId: string,
    tones: string | number,
    options?: DTMFOptions,
  ) {
    return this.sessionModule.sendDTMFSession(sessionId, tones, options);
  }

  public transferSession(
    sessionId: string,
    target: string,
    options?: ReferOptions,
  ) {
    return this.sessionModule.transferSession(sessionId, target, options);
  }

  public sendInfoSession(
    sessionId: string,
    contentType: string,
    body?: string,
    options?: ExtraHeaders
  ) {
    return this.sessionModule.sendInfoSession(sessionId, contentType, body, options);
  }

  public updateSession(sessionId: string, options?: RenegotiateOptions) {
    return this.sessionModule.updateSession(sessionId, options);
  }

  public reinviteSession(sessionId: string, options?: RenegotiateOptions) {
    return this.sessionModule.updateSession(sessionId, options);
  }

  public setSessionMedia(sessionId: string, stream: MediaStream) {
    this.sessionModule.setSessionMedia(sessionId, stream);
  }

  public getSession(sessionId: string) {
    return this.sessionModule.getSession(sessionId);
  }

  public getSessionIds() {
    return this.sessionModule.getSessionIds();
  }

  public getSessions() {
    return this.sessionModule.getSessions();
  }
}

export function createSipClientInstance(options?: SipClientOptions): SipClient {
  return new SipClient(options);
}

export { createSipEventManager };
