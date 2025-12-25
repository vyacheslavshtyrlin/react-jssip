import {
  createSipClientInstance,
  createSipEventManager,
  WebSocketInterface,
  SipStatus,
  CallStatus,
  CallDirection,
} from "./jssip-lib";



export * from "./context";

export * from "./hooks/useSipState";
export * from "./hooks/useSipActions";
export * from "./hooks/useSip";
export * from "./hooks/useSipSessions";
export * from "./hooks/useSipEvent";
export * from "./components/call-player";

export * from "./provider";

export {
  CallStatus,
  CallDirection,
  createSipClientInstance,
  createSipEventManager,
  WebSocketInterface,
  SipStatus,
};

import type {
  SipState,
  SipStatusType,
  CallDirectionType,
  CallStatusType,
} from "./jssip-lib"; // type (compile-time)
import type { SipSessionState } from "./jssip-lib/core/types";

export type {
  SipState,
  SipSessionState,
  SipStatusType,
  CallDirectionType,
  CallStatusType,
};
