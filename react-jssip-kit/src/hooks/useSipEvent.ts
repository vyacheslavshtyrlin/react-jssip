import { useEffect } from "react";
import type {
  SessionEventName,
  SessionEventPayload,
  UAEventName,
  UAEventPayload,
} from "jssip-lib";
import { useSip } from "./useSip";

export function useSipEvent<K extends UAEventName>(
  event: K,
  handler?: (payload?: UAEventPayload<K>) => void
) {
  const { sipEventManager } = useSip();

  useEffect(() => {
    if (!handler) return;
    return sipEventManager.onUA(event, handler);
  }, [event, handler, sipEventManager]);
}

export function useSipSessionEvent<K extends SessionEventName>(
  sessionId: string,
  event: K,
  handler?: (payload?: SessionEventPayload<K>) => void
) {
  const { sipEventManager } = useSip();

  useEffect(() => {
    if (!handler) return;
    return sipEventManager.onSession(sessionId, event, handler);
  }, [event, handler, sessionId, sipEventManager]);
}
