import { UAEventMap } from "../types";
import { SipStatus } from "../../core/types";
import { SipStateStore } from "../../core/sipStateStore";
import { JsSIPEventMap } from "../types";
import { EventTargetEmitter } from "../../core/eventEmitter";
import { SipErrorPayload } from "../../core/sipErrorHandler";

type Deps = {
  emitter: EventTargetEmitter<JsSIPEventMap>;
  state: SipStateStore;
  cleanupAllSessions: () => void;
  emitError: (
    raw: any,
    code?: string,
    fallback?: string
  ) => SipErrorPayload;
  onNewRTCSession: UAEventMap["newRTCSession"];
};

export function createUAHandlers(deps: Deps): Partial<UAEventMap> {
  const { emitter, state, cleanupAllSessions, emitError, onNewRTCSession } =
    deps;

  return {
    connecting: (e: any) => {
      emitter.emit("connecting", e);
      state.batchSet({ sipStatus: SipStatus.Connecting });
    },
    connected: (e: any) => {
      emitter.emit("connected", e);
      state.batchSet({ sipStatus: SipStatus.Connected });
    },
    disconnected: (e: any) => {
      emitter.emit("disconnected", e);
      cleanupAllSessions();
      state.reset();
    },

    registered: (e: any) => {
      emitter.emit("registered", e);
      state.batchSet({ sipStatus: SipStatus.Registered, error: null });
    },
    unregistered: (e: any) => {
      emitter.emit("unregistered", e);
      state.batchSet({ sipStatus: SipStatus.Unregistered });
    },
    registrationFailed: (e: any) => {
      emitter.emit("registrationFailed", e);
      cleanupAllSessions();
      emitError(
        {
          raw: e,
          cause: e?.cause,
          statusCode: e?.response?.status_code,
          statusText: e?.response?.reason_phrase,
        },
        "REGISTRATION_FAILED",
        "registration failed"
      );
      state.batchSet({
        sipStatus: SipStatus.RegistrationFailed,
        error: e?.cause || "registration failed",
      });
    },
    newRTCSession: onNewRTCSession,
    newMessage: (e: any) => emitter.emit("newMessage", e),
    sipEvent: (e: any) => emitter.emit("sipEvent", e),
    newOptions: (e: any) => emitter.emit("newOptions", e),
  };
}
