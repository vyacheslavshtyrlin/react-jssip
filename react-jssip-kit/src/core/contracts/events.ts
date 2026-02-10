export type DomainEventMap = {
  "sip.connecting": { at: number };
  "sip.connected": { at: number };
  "sip.registered": { at: number };
  "sip.disconnected": { at: number; reason?: string };
  "sip.error": { at: number; message: string };
  "call.created": {
    at: number;
    sessionId: string;
    direction: "local" | "remote";
  };
  "call.accepted": { at: number; sessionId: string };
  "call.ended": { at: number; sessionId: string; cause?: string };
};
