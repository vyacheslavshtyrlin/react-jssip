import type { SipClient } from "../../client";
import type { RTCSession, SipEventManager } from "../../sip/types";

function getSessionFromPayload(payload: unknown): RTCSession | null {
  return (payload as { session?: RTCSession } | undefined)?.session ?? null;
}

export function createSipEventManager(client: SipClient): SipEventManager {
  return {
    onUA(event, handler) {
      return client.on(event, handler as any);
    },
    onSession(sessionId, event, handler) {
      const wrapped = handler as any;
      let attachedSession: RTCSession | null = null;

      const detach = () => {
        if (!attachedSession) return;
        attachedSession.off(event, wrapped);
        attachedSession = null;
      };

      const attach = (session: RTCSession | null) => {
        if (!session) return;
        const id = String((session as any)?.id ?? "");
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
