import type { SipClient } from "../../client";
import type { SipEventManager } from "../../sip/types";

export function createSipEventManager(client: SipClient): SipEventManager {
  return {
    onUA(event, handler) {
      return client.on(event, handler as any);
    },
    onSession(sessionId, event, handler) {
      const session = client.getSession(sessionId);
      if (!session) return () => {};
      session.on(event, handler as any);
      return () => session.off(event, handler as any);
    },
  };
}
