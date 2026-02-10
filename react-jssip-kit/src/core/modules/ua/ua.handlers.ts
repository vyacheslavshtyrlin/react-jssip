import type { UAEventMap } from "../../sip/types";
import { SipStatus } from "../../contracts/state";
import type { SipStateStore } from "../state/sip.state.store";
import type { JsSIPEventMap } from "../../sip/types";
import type { EventTargetEmitter } from "../event/event-target.emitter";
import type {
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
