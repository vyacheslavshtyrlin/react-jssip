import type { UAEventMap } from "../../sip/types";
import { SipStatus } from "../../contracts/state";
import type { StateAdapter } from "../../contracts/state";
import type { JsSIPEventMap } from "../../sip/types";
import type { JssipEventEmitter } from "../event/event-target.emitter";
import type {
  IncomingMessageEvent,
  IncomingOptionsEvent,
  OutgoingMessageEvent,
  OutgoingOptionsEvent,
} from "jssip/src/UA";

type Deps = {
  emitter: JssipEventEmitter<JsSIPEventMap>;
  state: StateAdapter;
  onNewRTCSession: UAEventMap["newRTCSession"];
  onDisconnected: () => void;
  onConnected: () => void;
};

export function createUAHandlers(deps: Deps): Partial<UAEventMap> {
  const { emitter, state } = deps;

  return {
    connecting: (e) => {
      emitter.emit("connecting", e);
      state.batchSet({ sipStatus: SipStatus.Connecting });
    },
    connected: (e) => {
      emitter.emit("connected", e);
      state.batchSet({ sipStatus: SipStatus.Connected });
      deps.onConnected();
    },
    disconnected: (e) => {
      emitter.emit("disconnected", e);
      deps.onDisconnected();
    },

    registered: (e) => {
      emitter.emit("registered", e);
      state.batchSet({ sipStatus: SipStatus.Registered, error: null });
      deps.onConnected();
    },
    unregistered: (e) => {
      emitter.emit("unregistered", e);
      state.batchSet({ sipStatus: SipStatus.Unregistered });
    },
    registrationFailed: (e) => {
      emitter.emit("registrationFailed", e);
      state.batchSet({
        sipStatus: SipStatus.RegistrationFailed,
        error: e?.cause || "registration failed",
      });
    },
    newRTCSession: deps.onNewRTCSession,
    newMessage: (e: IncomingMessageEvent | OutgoingMessageEvent) =>
      emitter.emit("newMessage", e),
    sipEvent: (e: any) => emitter.emit("sipEvent", e),
    newOptions: (e: IncomingOptionsEvent | OutgoingOptionsEvent) =>
      emitter.emit("newOptions", e),
  };
}
