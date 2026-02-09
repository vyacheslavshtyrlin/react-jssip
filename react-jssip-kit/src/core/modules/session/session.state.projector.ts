import { CallStatus, SipSessionState } from "../../contracts/state";
import { SipStateStore } from "../state/sip.state.store";

function toSessionMaps(sessions: SipSessionState[]) {
  const sessionsById: Record<string, SipSessionState> = {};
  const sessionIds: string[] = [];

  for (const session of sessions) {
    sessionsById[session.id] = session;
    sessionIds.push(session.id);
  }

  return { sessionsById, sessionIds };
}

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
  const sessions = current.sessionIds.map((id) =>
    id === sessionId ? nextSession : current.sessionsById[id]
  );

  if (!existing) {
    sessions.push(nextSession);
  }

  const { sessionsById, sessionIds } = toSessionMaps(sessions);

  state.setState({ sessions, sessionsById, sessionIds });
}

export function removeSessionState(state: SipStateStore, sessionId: string) {
  const current = state.getState();
  const sessions = current.sessionIds
    .filter((id) => id !== sessionId)
    .map((id) => current.sessionsById[id]);
  const { sessionsById, sessionIds } = toSessionMaps(sessions);

  state.setState({
    sessions,
    sessionsById,
    sessionIds,
    error: null,
  });
}
