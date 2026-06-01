import type { UA } from "jssip";

// ─── Top-level handles ────────────────────────────────────────────────────────
// Only `UA` is imported from jssip's main entry point so the library works
// with any jssip 3.x version regardless of src/ vs lib/ directory layout.

type _UA = UA;
type _RTC = ReturnType<_UA["call"]>;
type _Msg = ReturnType<_UA["sendMessage"]>;

// ─── RTCSession interface ─────────────────────────────────────────────────────
// Defined as a structural interface so the emitted .d.ts has no jssip/src/
// reference. Jssip's actual RTCSession satisfies this interface structurally.
// SessionEventName / RTCSessionEventMap are defined below; forward-ref is fine
// because TypeScript resolves them lazily in the interface body.
export interface RTCSession {
  readonly id: string;
  readonly direction: "incoming" | "outgoing";
  readonly remote_identity: { uri: unknown };
  isInProgress(): boolean;
  isEstablished(): boolean;
  isEnded(): boolean;
  isOnHold(): { local: boolean; remote: boolean };
  isMuted(): { audio?: boolean; video?: boolean };
  answer(options?: AnswerOptions): void;
  terminate(options?: TerminateOptions): void;
  sendDTMF(tones: string | number, options?: DTMFOptions): void;
  hold(options?: ExtraHeaders, done?: () => void): boolean;
  unhold(options?: ExtraHeaders, done?: () => void): boolean;
  renegotiate(options?: RenegotiateOptions, done?: () => void): boolean;
  mute(options?: { audio?: boolean; video?: boolean }): void;
  unmute(options?: { audio?: boolean; video?: boolean }): void;
  refer(target: unknown, options?: ReferOptions): void;
  sendInfo(contentType: string, body?: string, options?: ExtraHeaders): void;
  on<K extends SessionEventName>(type: K, listener: RTCSessionEventMap[K]): this;
  off<K extends SessionEventName>(type: K, listener: RTCSessionEventMap[K]): this;
}

// ─── Option types extracted from method signatures ───────────────────────────
export type AnswerOptions = NonNullable<Parameters<_RTC["answer"]>[0]>;
export type TerminateOptions = NonNullable<Parameters<_RTC["terminate"]>[0]>;
export type DTMFOptions = NonNullable<Parameters<_RTC["sendDTMF"]>[1]>;
export type ReferOptions = NonNullable<Parameters<_RTC["refer"]>[1]>;
export type RenegotiateOptions = NonNullable<Parameters<_RTC["renegotiate"]>[0]>;
export type ExtraHeaders = NonNullable<Parameters<_RTC["sendInfo"]>[2]>;
export type CallOptions = NonNullable<Parameters<_UA["call"]>[1]>;
export type SendMessageOptions = NonNullable<Parameters<_UA["sendMessage"]>[2]>;

// ─── Message event map extracted from Message.on ─────────────────────────────
type _MsgEventName = Parameters<_Msg["on"]>[0] & string;
type _MsgListener<K extends _MsgEventName> =
  _Msg extends { on(type: K, listener: infer F): unknown } ? F : never;
export type MessageEventMap = { [K in _MsgEventName]: _MsgListener<K> };

// ─── UA configuration ────────────────────────────────────────────────────────
// Inlined because UAConfiguration is a constructor parameter and cannot be
// extracted from the instance type. Structurally compatible with jssip's own
// UAConfiguration; WebSocketInterface (exported at top level) satisfies SipSocket.
export interface SipSocket {
  via_transport: string;
  url: string;
  sip_uri: string;
  connect(): void;
  disconnect(): void;
  send(message: string | ArrayBufferLike | Blob | ArrayBufferView): boolean;
  isConnected(): boolean;
  isConnecting(): boolean;
  onconnect(): void;
  ondisconnect(error: boolean, code?: number, reason?: string): void;
  ondata<T>(event: T): void;
}
interface _WeightedSocket {
  socket: SipSocket;
  weight: number;
}
export interface UAConfiguration {
  sockets: SipSocket | SipSocket[] | _WeightedSocket[];
  uri: string;
  authorization_jwt?: string;
  authorization_user?: string;
  connection_recovery_max_interval?: number;
  connection_recovery_min_interval?: number;
  contact_uri?: string;
  display_name?: string;
  instance_id?: string;
  no_answer_timeout?: number;
  session_timers?: boolean;
  session_timers_refresh_method?: string;
  session_timers_force_refresher?: boolean;
  password?: string;
  realm?: string;
  ha1?: string;
  register?: boolean;
  register_expires?: number;
  register_from_tag_trail?: string | (() => string);
  registrar_server?: string;
  use_preloaded_route?: boolean;
  user_agent?: string;
  extra_headers?: string[];
}

// ─── Event type extraction ───────────────────────────────────────────────────

type _UA_EventName = Parameters<_UA["on"]>[0] & string;
type _RTC_EventName = Parameters<_RTC["on"]>[0] & string;

export type UAEventName = _UA_EventName;
export type SessionEventName = _RTC_EventName;
export type JsSIPEventName = UAEventName | SessionEventName;

type _UAListener<K extends UAEventName> =
  _UA extends { on(type: K, listener: infer F): unknown } ? F : never;

type _SessionListener<K extends SessionEventName> =
  _RTC extends { on(type: K, listener: infer F): unknown } ? F : never;

// Distributive helper: spreads union listener types so union events
// (e.g. newRTCSession: IncomingListener | OutgoingListener) yield a
// union payload instead of an intersection.
type _Payload<F> = F extends (event: infer P) => unknown ? P : undefined;

export type UAEventPayload<K extends UAEventName> = _Payload<_UAListener<K>>;
export type SessionEventPayload<K extends SessionEventName> = _Payload<
  _SessionListener<K>
>;

// RTCSessionEvent = newRTCSession payload (IncomingRTCSessionEvent | OutgoingRTCSessionEvent)
export type RTCSessionEvent = UAEventPayload<"newRTCSession">;

export type UAEventMap = { [K in UAEventName]: _UAListener<K> };
export type RTCSessionEventMap = { [K in SessionEventName]: _SessionListener<K> };

export type JsSIPEventPayload<K extends JsSIPEventName> = K extends UAEventName
  ? UAEventPayload<K>
  : K extends SessionEventName
    ? SessionEventPayload<K>
    : never;

export type JsSIPEventHandler<K extends JsSIPEventName> = (
  payload?: JsSIPEventPayload<K>
) => void;

export type SipEventHandlers = {
  [K in JsSIPEventName]?: JsSIPEventHandler<K>;
};

export interface SipEventManager {
  onUA: <K extends UAEventName>(
    event: K,
    handler: (payload?: UAEventPayload<K>) => void
  ) => () => void;
  onSession: <K extends SessionEventName>(
    sessionId: string,
    event: K,
    handler: (payload?: SessionEventPayload<K>) => void
  ) => () => void;
}

export type MicDropPayload = {
  sessionId: string;
  trackLive: boolean;
  senderLive: boolean;
};

export type SessionIceFailedPayload = {
  sessionId: string;
};

export type JsSIPEventMap = {
  [K in JsSIPEventName]: JsSIPEventPayload<K>;
} & { micDrop: MicDropPayload; sessionIceFailed: SessionIceFailedPayload };

export type SipCallOptions = CallOptions;
export type SipSendMessageOptions = SendMessageOptions;
export type SipSendOptionsOptions = ExtraHeaders & {
  contentType?: string;
  eventHandlers?: Partial<MessageEventMap>;
};

export type SipConfiguration = Omit<UAConfiguration, "password" | "uri"> & {
  debug?: boolean | string;
  enableMicRecovery?: boolean;
  micRecoveryIntervalMs?: number;
  micRecoveryMaxRetries?: number;
  maxSessionCount?: number;
  iceCandidateReadyDelayMs?: number;
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  };
};
