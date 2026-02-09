import {
  AnswerOptions,
  DTMFOptions,
  EndEvent,
  ReferOptions,
  RTCSession,
  RTCSessionEventMap,
  TerminateOptions,
} from "jssip/src/RTCSession";
import {
  IncomingRTCSessionEvent,
  UAConfiguration,
  UAEventMap,
  RTCSessionEvent,
  CallOptions,
} from "jssip/src/UA";

type UAExtraEvents = {
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

export type SipCallOptions = CallOptions;

export type SipConfiguration = Omit<UAConfiguration, "password" | "uri"> & {
  debug?: boolean | string;
  enableMicRecovery?: boolean;
  micRecoveryIntervalMs?: number;
  micRecoveryMaxRetries?: number;
  maxSessionCount?: number;
  iceCandidateReadyDelayMs?: number;
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
