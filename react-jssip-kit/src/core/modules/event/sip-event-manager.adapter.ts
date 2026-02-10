import type { SipClient } from "../../client";
import type {
  RTCSession,
  RTCSessionEventMap,
  SessionEventName,
  SessionEventPayload,
  SipEventManager,
} from "../../sip/types";

function getSessionFromPayload(payload: unknown): RTCSession | null {
  return (payload as { session?: RTCSession } | undefined)?.session ?? null;
}

function getSessionId(session: RTCSession): string {
  return String(session.id ?? "");
}

export function createSipEventManager(client: SipClient): SipEventManager {
  return {
    onUA(event, handler) {
      return client.on(event, handler);
    },
    onSession(sessionId, event, handler) {
      type SessionListener<K extends SessionEventName> = RTCSessionEventMap[K];
      const wrapped = ((payload: SessionEventPayload<typeof event>) => {
        handler(payload);
      }) as SessionListener<typeof event>;

      let attachedSession: RTCSession | null = null;

      const detach = () => {
        if (!attachedSession) return;
        attachedSession.off(event, wrapped);
        attachedSession = null;
      };

      const attach = (session: RTCSession | null) => {
        if (!session) return;
        const id = getSessionId(session);
        if (!id || id !== sessionId) return;
        if (attachedSession === session) return;

        detach();
        attachedSession = session;
        attachedSession.on(event, wrapped);
      };

      const offNewSession = client.on("newRTCSession", (payload) => {
        attach(getSessionFromPayload(payload));
      });

      attach(client.getSession(sessionId) ?? null);

      const offDisconnected = client.on("disconnected", () => {
        detach();
      });

      return () => {
        offNewSession();
        offDisconnected();
        detach();
      };
    },
  };
}
