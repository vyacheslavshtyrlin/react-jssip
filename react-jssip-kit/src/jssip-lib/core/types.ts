import { Originator } from "jssip/src/RTCSession";

export const SipStatus = {
  Disconnected: "disconnected",
  Connecting: "connecting",
  Connected: "connected",
  Registered: "registered",
  Unregistered: "unregistered",
  RegistrationFailed: "registrationFailed",
} as const;

export type SipStatus = (typeof SipStatus)[keyof typeof SipStatus];

export const CallStatus = {
  Idle: "idle",
  Dialing: "dialing",
  Ringing: "ringing",
  Active: "active",
  Hold: "hold",
} as const;
export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus];

export type CallDirection = Originator.LOCAL | Originator.REMOTE;

export type SipSessionState = {
  id: string;
  status: CallStatus;
  direction: CallDirection | null;
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

export const SipStatusList = Object.values(SipStatus);
export const CallStatusList = Object.values(CallStatus);

export function isSipStatus(v: unknown): v is SipStatus {
  return (
    typeof v === "string" && (SipStatusList as readonly string[]).includes(v)
  );
}
export function isCallStatus(v: unknown): v is CallStatus {
  return (
    typeof v === "string" && (CallStatusList as readonly string[]).includes(v)
  );
}

export type Unsubscribe = () => void;
export type Listener<T> = (value: T) => void;
