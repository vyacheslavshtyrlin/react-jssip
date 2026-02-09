import "./core/modules/debug/sip-debugger";
import {
  SipStatus,
  CallStatus,
  CallDirection,
} from "./core/contracts/state";
import { WebSocketInterface } from "jssip";
import {
  createSipClientInstance,
  createSipEventManager,
} from "./core/client";
import { createSipKernel } from "./core/kernel";

export { useSipState } from "./hooks/useSipState";
export { useSipActions } from "./hooks/useSipActions";
export { useSipKernel } from "./hooks/useSip";
export { useSipSelector } from "./hooks/useSipSelector";
export { useActiveSipSession } from "./hooks/useActiveSipSession";
export { useSipSession } from "./hooks/useSipSession";
export { useSipSessions } from "./hooks/useSipSessions";
export { useSipEvent, useSipSessionEvent } from "./hooks/useSipEvent";
export { useSessionMedia } from "./hooks/useSessionMedia";
export { CallPlayer } from "./components/call-player";

export { SipProvider } from "./provider";
export type { SipProviderProps } from "./provider";

export {
  CallStatus,
  CallDirection,
  createSipClientInstance,
  createSipKernel,
  createSipEventManager,
  WebSocketInterface,
  SipStatus,
};

import type {
  SipState,
  SipSessionState,
  SipStatus as SipStatusType,
  CallDirection as CallDirectionType,
  CallStatus as CallStatusType,
  CallOptions,
  AnswerOptions,
  DTMFOptions,
  ReferOptions,
  JsSIPEventMap,
  JsSIPEventName,
  SessionEventName,
  SessionEventPayload,
  UAEventName,
  UAEventPayload,
  SipEventHandlers,
  SipEventManager,
  RTCSession,
  TerminateOptions,
  RTCSessionEventMap,
  SipConfiguration,
  SipKernel,
} from "./core/public-types";

export type {
  SipState,
  SipSessionState,
  SipStatusType,
  CallDirectionType,
  CallStatusType,
  CallOptions,
  AnswerOptions,
  DTMFOptions,
  ReferOptions,
  JsSIPEventMap,
  JsSIPEventName,
  SessionEventName,
  SessionEventPayload,
  UAEventName,
  UAEventPayload,
  SipEventHandlers,
  SipEventManager,
  RTCSession,
  TerminateOptions,
  RTCSessionEventMap,
  SipConfiguration,
  SipKernel,
};
