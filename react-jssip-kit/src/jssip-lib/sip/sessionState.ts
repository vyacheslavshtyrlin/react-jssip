import { CallDirection, CallStatus, SipSessionState } from "../core/types";
import { SipStateStore } from "../core/sipStateStore";

export function holdOtherSessions(
  state: SipStateStore,
  sessionId: string,
  holdFn: (id: string) => void
) {
  const current = state.getState();
  current.sessions.forEach((s) => {
    if (s.id === sessionId) return;
    if (s.status === CallStatus.Active) {
      holdFn(s.id);
    }
  });
}

export function upsertSessionState(
  state: SipStateStore,
  sessionId: string,
  partial: Partial<SipSessionState>
) {
  const current = state.getState();
  const existing = current.sessions.find((s) => s.id === sessionId);
  const base: SipSessionState = existing ?? {
    id: sessionId,
    status: CallStatus.Idle,
    direction: CallDirection.None,
    from: null,
    to: null,
    muted: false,
    acceptedAt: null,
    mediaKind: "audio",
    remoteVideoEnabled: false,
  };

  const nextSession = { ...base, ...partial };
  const sessions = existing
    ? current.sessions.map((s) => (s.id === sessionId ? nextSession : s))
    : [...current.sessions, nextSession];

  state.setState({ sessions });
}

export function removeSessionState(state: SipStateStore, sessionId: string) {
  const current = state.getState();
  const sessions = current.sessions.filter((s) => s.id !== sessionId);
  state.setState({
    sessions,
    error: null,
  });
}
