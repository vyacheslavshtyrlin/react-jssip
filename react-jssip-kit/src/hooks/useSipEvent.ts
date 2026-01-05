import { useEffect } from "react";
import type { JsSIPEventHandler, JsSIPEventName } from "jssip-lib";
import { useSip } from "./useSip";

type EventName = JsSIPEventName | "sessionCleanup";

export function useSipEvent<K extends EventName>(
  event: K,
  handler?: JsSIPEventHandler<K>
) {
  const { sipEventManager } = useSip();

  useEffect(() => {
    if (!handler) return;
    return sipEventManager.on(event as JsSIPEventName, handler as any);
  }, [event, handler, sipEventManager]);
}

export function useSipSessionEvent<K extends EventName>(
  sessionId: string | null | undefined,
  event: K,
  handler?: JsSIPEventHandler<K>
) {
  const { sipEventManager } = useSip();

  useEffect(() => {
    if (!handler || !sessionId) return;
    return sipEventManager.onSession(sessionId, event as JsSIPEventName, handler as any);
  }, [event, handler, sessionId, sipEventManager]);
}
