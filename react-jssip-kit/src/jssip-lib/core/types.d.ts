export declare const SipStatus: {
    readonly Disconnected: "disconnected";
    readonly Connecting: "connecting";
    readonly Connected: "connected";
    readonly Registered: "registered";
    readonly Unregistered: "unregistered";
    readonly RegistrationFailed: "registrationFailed";
};
export type SipStatus = typeof SipStatus[keyof typeof SipStatus];
export declare const CallStatus: {
    readonly Idle: "idle";
    readonly Dialing: "dialing";
    readonly Ringing: "ringing";
    readonly Active: "active";
    readonly Hold: "hold";
};
export type CallStatus = typeof CallStatus[keyof typeof CallStatus];
export declare const CallDirection: {
    readonly Incoming: "incoming";
    readonly Outgoing: "outgoing";
    readonly None: "none";
};
export type CallDirection = typeof CallDirection[keyof typeof CallDirection];
export type SipSessionState = {
    id: string;
    status: CallStatus;
    direction: CallDirection;
    from: string | null;
    to: string | null;
    muted: boolean;
    acceptedAt: number | null;
    mediaKind: "audio" | "video";
    remoteVideoEnabled: boolean;
};
export interface SipState {
    sipStatus: SipStatus;
    error: string | null;
    sessions: SipSessionState[];
}
export declare const SipStatusList: ("connecting" | "connected" | "disconnected" | "registered" | "unregistered" | "registrationFailed")[];
export declare const CallStatusList: ("idle" | "dialing" | "ringing" | "active")[];
export declare const CallDirectionList: ("incoming" | "outgoing" | "none")[];
export declare function isSipStatus(v: unknown): v is SipStatus;
export declare function isCallStatus(v: unknown): v is CallStatus;
export declare function isCallDirection(v: unknown): v is CallDirection;
export type Unsubscribe = () => void;
export type Listener<T> = (value: T) => void;
