import { CallStatus, SipSessionState, SipState, SipStatus } from "../../contracts/state";

export function selectSipStatus(state: SipState): SipStatus {
  return state.sipStatus;
}

export function selectSipError(state: SipState): string | null {
  return state.error;
}

export function selectSessions(state: SipState): SipSessionState[] {
  return state.sessions;
}

export function selectSessionById(
  state: SipState,
  sessionId: string
): SipSessionState | null {
  return state.sessions.find((session) => session.id === sessionId) ?? null;
}

export function selectActiveSession(state: SipState): SipSessionState | null {
  return state.sessions.find((session) => session.status === CallStatus.Active) ?? null;
}
