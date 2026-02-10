import {
  AnswerOptions,
  DTMFOptions,
  EndEvent,
  ExtraHeaders,
  ReferOptions,
  RenegotiateOptions,
  RTCSession,
  RTCSessionEventMap,
  TerminateOptions,
} from "jssip/src/RTCSession";
import { MessageEventMap, SendMessageOptions } from "jssip/src/Message";
import {
  UAConfiguration,
  UAEventMap,
  RTCSessionEvent,
  CallOptions,
} from "jssip/src/UA";

export type UAEventName = keyof UAEventMap;
export type SessionEventName = keyof RTCSessionEventMap;
export type JsSIPEventName = UAEventName | SessionEventName;

export type UAEventPayload<K extends UAEventName> = Parameters<
  UAEventMap[K]
>[0];

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
};

export type {
  RTCSession,
  RTCSessionEventMap,
  AnswerOptions,
  DTMFOptions,
  ExtraHeaders,
  ReferOptions,
  RenegotiateOptions,
  MessageEventMap,
  SendMessageOptions,
  UAConfiguration,
  UAEventMap,
  TerminateOptions,
  EndEvent,
  CallOptions,
  RTCSessionEvent,
};
