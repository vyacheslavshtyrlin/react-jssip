import type { SipSessionState } from "../core/contracts/state";
import { useSipInternalSelector } from "./useSipInternalSelector";

export function useSipSession(sessionId?: string): SipSessionState | null {
  return useSipInternalSelector((state) =>
    sessionId ? (state.sessionsById[sessionId] ?? null) : null
  );
}
