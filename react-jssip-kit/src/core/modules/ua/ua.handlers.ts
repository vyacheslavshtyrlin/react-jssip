import type { UAEventMap } from "../../sip/types";
import { SipStatus } from "../../contracts/state";
import type { StateAdapter } from "../../contracts/state";
import type { JsSIPEventMap } from "../../sip/types";
import type { JssipEventEmitter } from "../event/event-target.emitter";

type Deps = {
  emitter: JssipEventEmitter<JsSIPEventMap>;
  state: StateAdapter;
  onNewRTCSession: UAEventMap["newRTCSession"];
  onDisconnected: () => void;
  onConnected: () => void;
};

// Typed emit helper — handler `e` is unknown because UAEventMap uses
// conditional types that TypeScript cannot use for contextual inference.
// The cast is safe: jssip fires exactly the event shape the emitter expects.
const emit = <K extends keyof JsSIPEventMap>(
  emitter: JssipEventEmitter<JsSIPEventMap>,
  event: K,
  e: unknown
) => emitter.emit(event, e as JsSIPEventMap[K]);

export function createUAHandlers(deps: Deps): Partial<UAEventMap> {
  const { emitter, state } = deps;

  return {
    connecting: (e: unknown) => {
      emit(emitter, "connecting", e);
      state.batchSet({ sipStatus: SipStatus.Connecting });
    },
    connected: (e: unknown) => {
      emit(emitter, "connected", e);
      state.batchSet({ sipStatus: SipStatus.Connected });
      deps.onConnected();
    },
    disconnected: (e: unknown) => {
      emit(emitter, "disconnected", e);
      deps.onDisconnected();
    },
    registered: (e: unknown) => {
      emit(emitter, "registered", e);
      state.batchSet({ sipStatus: SipStatus.Registered, error: null });
      deps.onConnected();
    },
    unregistered: (e: unknown) => {
      emit(emitter, "unregistered", e);
      state.batchSet({ sipStatus: SipStatus.Unregistered });
    },
    registrationFailed: (e: unknown) => {
      emit(emitter, "registrationFailed", e);
      state.batchSet({
        sipStatus: SipStatus.RegistrationFailed,
        error: (e as { cause?: string } | undefined)?.cause ?? "registration failed",
      });
    },
    newRTCSession: deps.onNewRTCSession,
    newMessage: (e: unknown) => emit(emitter, "newMessage", e),
    sipEvent: (e: unknown) => emit(emitter, "sipEvent", e),
    newOptions: (e: unknown) => emit(emitter, "newOptions", e),
  } as Partial<UAEventMap>;
}
