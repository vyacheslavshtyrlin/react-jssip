export const SipStatus = {
  Disconnected: "disconnected",
  Connecting: "connecting",
  Connected: "connected",
  Registered: "registered",
  Unregistered: "unregistered",
  RegistrationFailed: "registrationFailed",
} as const;
export type SipStatus = typeof SipStatus[keyof typeof SipStatus];

export const CallStatus = {
  Idle: "idle",
  Dialing: "dialing",
  Ringing: "ringing",
  Active: "active",
  Hold: "hold",
} as const;
export type CallStatus = typeof CallStatus[keyof typeof CallStatus];

export const CallDirection = {
  Incoming: "incoming",
  Outgoing: "outgoing",
  None: "none",
} as const;
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

export const SipStatusList = Object.values(SipStatus);
export const CallStatusList = Object.values(CallStatus);
export const CallDirectionList = Object.values(CallDirection);

export function isSipStatus(v: unknown): v is SipStatus {
  return typeof v === "string" && (SipStatusList as readonly string[]).includes(v);
}
export function isCallStatus(v: unknown): v is CallStatus {
  return typeof v === "string" && (CallStatusList as readonly string[]).includes(v);
}
export function isCallDirection(v: unknown): v is CallDirection {
  return typeof v === "string" && (CallDirectionList as readonly string[]).includes(v);
}

export type Unsubscribe = () => void;
export type Listener<T> = (value: T) => void;
