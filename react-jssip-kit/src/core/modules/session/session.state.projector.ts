import type { SipSessionState } from "../../contracts/state";
import { CallStatus } from "../../contracts/state";
import type { SipStateStore } from "../state/sip.state.store";

export function holdOtherSessions(
  state: SipStateStore,
  sessionId: string,
  holdFn: (id: string) => void
) {
  const current = state.getState();
  current.sessionIds.forEach((id) => {
    if (id === sessionId) return;
    const session = current.sessionsById[id];
    if (session?.status === CallStatus.Active) {
      holdFn(id);
    }
  });
}

export function upsertSessionState(
  state: SipStateStore,
  sessionId: string,
  partial: Partial<SipSessionState>
) {
  const current = state.getState();
  const existing = current.sessionsById[sessionId];
  const base: SipSessionState = existing ?? {
    id: sessionId,
    status: CallStatus.Idle,
    direction: null,
    from: null,
    to: null,
    muted: false,
    acceptedAt: null,
  };

  const nextSession = { ...base, ...partial };
  const sessionsById = {
    ...current.sessionsById,
    [sessionId]: nextSession,
  };
  const sessionIds = existing
    ? current.sessionIds
    : [...current.sessionIds, sessionId];
  const sessions = existing
    ? current.sessions.map((session) =>
        session.id === sessionId ? nextSession : session
      )
    : [...current.sessions, nextSession];

  state.setState({ sessionsById, sessionIds, sessions });
}

export function removeSessionState(state: SipStateStore, sessionId: string) {
  const current = state.getState();
  if (!current.sessionsById[sessionId]) return;
  const sessionsById = { ...current.sessionsById };
  delete sessionsById[sessionId];
  const sessionIds = current.sessionIds.filter((id) => id !== sessionId);
  const sessions = current.sessions.filter(
    (session) => session.id !== sessionId
  );

  state.setState({
    sessions,
    sessionsById,
    sessionIds,
    error: null,
  });
}
