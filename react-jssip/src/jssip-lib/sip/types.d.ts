import type { RTCSessionEventMap } from "jssip/lib/RTCSession";
import type { IncomingRTCSessionEvent, UAConfiguration, UAEventMap } from "jssip/lib/UA";
export declare const JsSIPEventName: {
    readonly connecting: "connecting";
    readonly connected: "connected";
    readonly disconnected: "disconnected";
    readonly registered: "registered";
    readonly unregistered: "unregistered";
    readonly registrationFailed: "registrationFailed";
    readonly registrationExpiring: "registrationExpiring";
    readonly newRTCSession: "newRTCSession";
    readonly newMessage: "newMessage";
    readonly sipEvent: "sipEvent";
    readonly newOptions: "newOptions";
    readonly peerconnection: "peerconnection";
    readonly sending: "sending";
    readonly progress: "progress";
    readonly accepted: "accepted";
    readonly confirmed: "confirmed";
    readonly ended: "ended";
    readonly failed: "failed";
    readonly newDTMF: "newDTMF";
    readonly newInfo: "newInfo";
    readonly hold: "hold";
    readonly unhold: "unhold";
    readonly muted: "muted";
    readonly unmuted: "unmuted";
    readonly reinvite: "reinvite";
    readonly update: "update";
    readonly refer: "refer";
    readonly replaces: "replaces";
    readonly sdp: "sdp";
    readonly error: "error";
    readonly icecandidate: "icecandidate";
    readonly getusermediafailed: "getusermediafailed";
    readonly "peerconnection:createofferfailed": "peerconnection:createofferfailed";
    readonly "peerconnection:createanswerfailed": "peerconnection:createanswerfailed";
    readonly "peerconnection:setlocaldescriptionfailed": "peerconnection:setlocaldescriptionfailed";
    readonly "peerconnection:setremotedescriptionfailed": "peerconnection:setremotedescriptionfailed";
    readonly missed: "missed";
    readonly sessionCleanup: "sessionCleanup";
};
type ExtraEvents = {
    error: {
        cause: string;
        code?: string;
        raw?: any;
        message?: string;
    };
    missed: IncomingRTCSessionEvent;
    sessionCleanup: {
        sessionId: string;
        session?: import("jssip/lib/RTCSession").RTCSession | null;
    };
};
export type JsSIPEventName = keyof UAEventMap | keyof RTCSessionEventMap | keyof ExtraEvents | "sessionCleanup";
export type JsSIPEventPayload<K extends JsSIPEventName> = K extends keyof UAEventMap ? Parameters<UAEventMap[K]>[0] : K extends keyof RTCSessionEventMap ? Parameters<RTCSessionEventMap[K]>[0] : K extends keyof ExtraEvents ? ExtraEvents[K] : never;
export type JsSIPEventHandler<K extends JsSIPEventName> = (payload?: JsSIPEventPayload<K>) => void;
export type SipEventHandlers = {
    [K in JsSIPEventName]?: JsSIPEventHandler<K>;
};
export interface SipEventManager {
    bind: (handlers: SipEventHandlers) => () => void;
}
export type JsSIPEventMap = {
    [K in JsSIPEventName]: JsSIPEventPayload<K>;
};
export type { RTCSession, EndEvent, RTCSessionEventMap, TerminateOptions, OutgoingEvent, IncomingEvent, HoldEvent, AnswerOptions, ReferOptions, } from "jssip/lib/RTCSession";
import type { DTFMOptions as _DTMFOptions } from "jssip/lib/RTCSession";
export type DTFMOptions = _DTMFOptions;
export type { CallOptions, ConnectedEvent, DisconnectEvent, RegisteredEvent, RTCSessionEvent, UAEventMap, UnRegisteredEvent, ConnectingEvent, } from "jssip/lib/UA";
/**
 * JsSIP call options with per-call From overrides.
 * - `fromUserName`: overrides the user part of the From header for this call.
 * - `fromDisplayName`: overrides the display name of the From header for this call.
 */
export type SipCallOptions = import("jssip/lib/UA").CallOptions;
export type SipConfiguration = Omit<UAConfiguration, "password" | "uri"> & {
    /**
     * Enable JsSIP debug logging. If string, treated as debug pattern.
     */
    debug?: boolean | string;
    /**
     * Maximum allowed concurrent sessions. Additional sessions are rejected.
     */
    maxSessionCount?: number;
    /**
     * Milliseconds to keep enqueued outgoing media before dropping. Defaults to 30000.
     */
    pendingMediaTtlMs?: number;
};
