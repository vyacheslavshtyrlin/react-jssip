import { CallStatus, SipSessionState, SipState, SipStatus } from "../../contracts/state";

export function selectSipStatus(state: SipState): SipStatus {
  return state.sipStatus;
}

export function selectSipError(state: SipState): string | null {
  return state.error;
}

export function selectSessionIds(state: SipState): string[] {
  return state.sessionIds;
}

export function selectSessions(state: SipState): SipSessionState[] {
  return state.sessions;
}

export function selectSessionById(
  state: SipState,
  sessionId: string
): SipSessionState | null {
  return state.sessionsById[sessionId] ?? null;
}

export function selectActiveSession(state: SipState): SipSessionState | null {
  const activeId = state.sessionIds.find(
    (id) => state.sessionsById[id]?.status === CallStatus.Active
  );
  return activeId ? state.sessionsById[activeId] : null;
}
