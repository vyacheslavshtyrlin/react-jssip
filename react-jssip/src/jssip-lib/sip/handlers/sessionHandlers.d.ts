import { RTCSessionEventMap } from "../types";
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
    onSessionFailed: (error?: string) => void;
};
export declare function createSessionHandlers(deps: Deps): Partial<RTCSessionEventMap>;
export {};
