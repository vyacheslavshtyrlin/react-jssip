import { UAEventMap } from "../types";
import { SipStatus } from "../../core/types";
import { SipStateStore } from "../../core/sipStateStore";
import { JsSIPEventMap } from "../types";
import { EventTargetEmitter } from "../../core/eventEmitter";
import { OutgoingMessage } from "http";
import {
  IncomingMessageEvent,
  IncomingOptionsEvent,
  OutgoingMessageEvent,
  OutgoingOptionsEvent,
} from "jssip/src/UA";

type Deps = {
  emitter: EventTargetEmitter<JsSIPEventMap>;
  state: SipStateStore;
  cleanupAllSessions: () => void;
  onNewRTCSession: UAEventMap["newRTCSession"];
};

export function createUAHandlers(deps: Deps): Partial<UAEventMap> {
  const { emitter, state, cleanupAllSessions, onNewRTCSession } = deps;

  return {
    connecting: (e) => {
      emitter.emit("connecting", e);
      state.batchSet({ sipStatus: SipStatus.Connecting });
    },
    connected: (e) => {
      emitter.emit("connected", e);
      state.batchSet({ sipStatus: SipStatus.Connected });
    },
    disconnected: (e) => {
      emitter.emit("disconnected", e);
      cleanupAllSessions();
      state.reset();
    },

    registered: (e) => {
      emitter.emit("registered", e);
      state.batchSet({ sipStatus: SipStatus.Registered, error: null });
    },
    unregistered: (e) => {
      emitter.emit("unregistered", e);
      state.batchSet({ sipStatus: SipStatus.Unregistered });
    },
    registrationFailed: (e) => {
      emitter.emit("registrationFailed", e);
      cleanupAllSessions();
      state.batchSet({
        sipStatus: SipStatus.RegistrationFailed,
        error: e?.cause || "registration failed",
      });
    },
    newRTCSession: onNewRTCSession,
    newMessage: (e: IncomingMessageEvent | OutgoingMessageEvent) =>
      emitter.emit("newMessage", e),
    sipEvent: (e: any) => emitter.emit("sipEvent", e),
    newOptions: (e: IncomingOptionsEvent | OutgoingOptionsEvent) =>
      emitter.emit("newOptions", e),
  };
}
