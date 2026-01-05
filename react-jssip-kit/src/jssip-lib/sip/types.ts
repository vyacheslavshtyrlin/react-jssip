import type { RTCSession, RTCSessionEventMap } from "jssip/lib/RTCSession";
import type {
  CallOptions,
  IncomingRTCSessionEvent,
  UAConfiguration,
  UAEventMap,
} from "jssip/lib/UA";

export const JsSIPEventName = {
  // UA events
  connecting: "connecting",
  connected: "connected",
  disconnected: "disconnected",
  registered: "registered",
  unregistered: "unregistered",
  registrationFailed: "registrationFailed",
  registrationExpiring: "registrationExpiring",
  newRTCSession: "newRTCSession",
  newMessage: "newMessage",
  sipEvent: "sipEvent",
  newOptions: "newOptions",

  // Session/PC events
  peerconnection: "peerconnection",
  sending: "sending",
  progress: "progress",
  accepted: "accepted",
  confirmed: "confirmed",
  ended: "ended",
  failed: "failed",
  newDTMF: "newDTMF",
  newInfo: "newInfo",
  hold: "hold",
  unhold: "unhold",
  muted: "muted",
  unmuted: "unmuted",
  reinvite: "reinvite",
  update: "update",
  refer: "refer",
  replaces: "replaces",
  sdp: "sdp",
  error: "error",
  icecandidate: "icecandidate",
  getusermediafailed: "getusermediafailed",
  "peerconnection:createofferfailed": "peerconnection:createofferfailed",
  "peerconnection:createanswerfailed": "peerconnection:createanswerfailed",
  "peerconnection:setlocaldescriptionfailed":
    "peerconnection:setlocaldescriptionfailed",
  "peerconnection:setremotedescriptionfailed":
    "peerconnection:setremotedescriptionfailed",

  missed: "missed",
} as const;

type ExtraEvents = {
  error: { cause: string; code?: string; raw?: any; message?: string };
  missed: IncomingRTCSessionEvent;
  sessionCleanup: { sessionId: string; session: RTCSession | null };
};

export type JsSIPEventName =
  | keyof UAEventMap
  | keyof RTCSessionEventMap
  | keyof ExtraEvents;

export type JsSIPEventPayload<K extends JsSIPEventName> =
  K extends SessionEventName
    ? { sessionId: string; data: BaseJsSIPEventPayload<K> }
    : BaseJsSIPEventPayload<K>;

type BaseJsSIPEventPayload<K extends JsSIPEventName> =
  K extends keyof UAEventMap
    ? Parameters<UAEventMap[K]>[0]
    : K extends keyof RTCSessionEventMap
    ? Parameters<RTCSessionEventMap[K]>[0]
    : K extends keyof ExtraEvents
    ? ExtraEvents[K]
    : never;

type SessionEventName = keyof RTCSessionEventMap | "missed" | "newRTCSession";

export type JsSIPEventHandler<K extends JsSIPEventName> = (
  payload?: JsSIPEventPayload<K>
) => void;

export type SipEventHandlers = {
  [K in JsSIPEventName]?: JsSIPEventHandler<K>;
};

export interface SipEventManager {
  on: <K extends JsSIPEventName>(
    event: K,
    handler: JsSIPEventHandler<K>
  ) => () => void;
  onSession: <K extends JsSIPEventName>(
    sessionId: string,
    event: K,
    handler: JsSIPEventHandler<K>
  ) => () => void;
  bind: (handlers: SipEventHandlers) => () => void;
  bindSession: (sessionId: string, handlers: SipEventHandlers) => () => void;
}

export type JsSIPEventMap = {
  [K in JsSIPEventName]: JsSIPEventPayload<K>;
};

export type {
  RTCSession,
  EndEvent,
  RTCSessionEventMap,
  TerminateOptions,
  OutgoingEvent,
  IncomingEvent,
  HoldEvent,
  AnswerOptions,
  ReferOptions,
} from "jssip/lib/RTCSession";

import type { DTFMOptions as _DTMFOptions } from "jssip/lib/RTCSession";
export type DTFMOptions = _DTMFOptions;

export type {
  CallOptions,
  ConnectedEvent,
  DisconnectEvent,
  RegisteredEvent,
  RTCSessionEvent,
  UAEventMap,
  UnRegisteredEvent,
  ConnectingEvent,
} from "jssip/lib/UA";

/**
 * JsSIP call options with per-call From overrides.
 * - `fromUserName`: overrides the user part of the From header for this call.
 * - `fromDisplayName`: overrides the display name of the From header for this call.
 */
export type SipCallOptions = CallOptions;

export type SipConfiguration = Omit<UAConfiguration, "password" | "uri"> & {
  /**
   * Enable JsSIP debug logging. If string, treated as debug pattern.
   */
  debug?: boolean | string;
  /**
   * Maximum allowed concurrent sessions. Additional sessions are rejected.
   */
  maxSessionCount?: number;
  /**
   * Milliseconds to keep enqueued outgoing media before dropping. Defaults to 30000.
   */
  pendingMediaTtlMs?: number;
};
