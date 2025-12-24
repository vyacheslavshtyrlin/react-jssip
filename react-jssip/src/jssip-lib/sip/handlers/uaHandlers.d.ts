import { UAEventMap } from "../types";
import { SipStateStore } from "../../core/sipStateStore";
import { WebRTCSessionController } from "../sessionController";
import { JsSIPEventMap } from "../types";
import { EventTargetEmitter } from "../../core/eventEmitter";
import { SipErrorPayload } from "../../core/sipErrorHandler";
type Deps = {
    emitter: EventTargetEmitter<JsSIPEventMap>;
    state: SipStateStore;
    rtc: WebRTCSessionController;
    detachSessionHandlers: () => void;
    emitError: (raw: any, code?: string, fallback?: string) => SipErrorPayload;
    onNewRTCSession: UAEventMap["newRTCSession"];
};
export declare function createUAHandlers(deps: Deps): Partial<UAEventMap>;
export {};
