import type { SipSessionState } from "../core/contracts/state";
import { useSipSelector } from "./useSipSelector";
import { CallStatus } from "../core/contracts/state";

export function useActiveSipSession(): SipSessionState | null {
  return useSipSelector((state) => {
    const activeId = state.sessionIds.find(
      (id) => state.sessionsById[id]?.status === CallStatus.Active
    );
    return activeId ? state.sessionsById[activeId] : null;
  });
}
