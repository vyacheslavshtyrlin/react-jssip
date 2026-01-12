import {
  RTCSessionEventMap,
  RTCSession,
  AnswerOptions,
  ReferOptions,
  TerminateOptions,
  DTMFOptions,
  EndEvent
} from "jssip/src/RTCSession";

import {
  IncomingRTCSessionEvent,
  UAConfiguration,
  UAEventMap,
  RTCSessionEvent,
  CallOptions,
} from "jssip/src/UA";

type UAExtraEvents = {
  error: { cause: string; code?: string; raw?: any; message?: string };
  missed: IncomingRTCSessionEvent;
};

export type UAEventName = keyof UAEventMap | keyof UAExtraEvents;
export type SessionEventName = keyof RTCSessionEventMap;
export type JsSIPEventName = UAEventName | SessionEventName;

export type UAEventPayload<K extends UAEventName> = K extends keyof UAEventMap
  ? Parameters<UAEventMap[K]>[0]
  : K extends keyof UAExtraEvents
  ? UAExtraEvents[K]
  : never;

export type SessionEventPayload<K extends SessionEventName> =
  K extends keyof RTCSessionEventMap
    ? Parameters<RTCSessionEventMap[K]>[0]
    : never;

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

export type JsSIPEventMap = {
  [K in JsSIPEventName]: JsSIPEventPayload<K>;
};

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

export type {
  RTCSession,
  RTCSessionEventMap,
  AnswerOptions,
  DTMFOptions,
  ReferOptions,
  IncomingRTCSessionEvent,
  UAConfiguration,
  UAEventMap,
  TerminateOptions,
  EndEvent,
  CallOptions,
  RTCSessionEvent,
};
