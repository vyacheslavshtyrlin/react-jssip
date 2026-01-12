import "./sip/debugger"; // ensure window helpers attach on load

export * from "./sip/types";

export {
  SipClient,
  createSipClientInstance,
  createSipEventManager,
} from "./sip/client";
export {
  SipDebugger,
  sipDebugger,
  type SipDebugToggleResult,
} from "./sip/debugger";

export { WebRTCSessionController } from "./sip/sessionController";
export { SessionManager } from "./sip/sessionManager";

export {
  SipErrorHandler,
  type SipErrorPayload,
  type SipErrorFormatter,
} from "./core/sipErrorHandler";

export { WebSocketInterface } from "jssip";

export {
  SipStatus,
  CallStatus,
  CallDirection,
  SipStatusList,
  CallStatusList,
  isSipStatus,
  isCallStatus,
} from "./core/types";

export type {
  SipStatus as SipStatusType,
  CallStatus as CallStatusType,
  CallDirection as CallDirectionType,
  SipState,
  SipSessionState,
} from "./core/types";
