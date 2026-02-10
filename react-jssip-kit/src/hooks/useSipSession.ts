import type { SipSessionState } from "../core/contracts/state";
import { useSipSelector } from "./useSipSelector";

export function useSipSession(sessionId?: string): SipSessionState | null {
  return useSipSelector((state) => {
    if (!sessionId) return null;
    return state.sessions.find((session) => session.id === sessionId) ?? null;
  });
}
