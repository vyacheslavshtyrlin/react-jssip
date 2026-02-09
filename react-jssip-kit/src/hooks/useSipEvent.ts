import { useEffect } from "react";
import type {
  SessionEventName,
  SessionEventPayload,
  UAEventName,
  UAEventPayload,
} from "../core/sip/types";
import { useSipKernel } from "./useSip";

export function useSipEvent<K extends UAEventName>(
  event: K,
  handler?: (payload?: UAEventPayload<K>) => void
) {
  const { events } = useSipKernel();

  useEffect(() => {
    if (!handler) return;
    return events.onUA(event, handler);
  }, [event, handler, events]);
}

export function useSipSessionEvent<K extends SessionEventName>(
  sessionId: string,
  event: K,
  handler?: (payload?: SessionEventPayload<K>) => void
) {
  const { events } = useSipKernel();

  useEffect(() => {
    if (!handler) return;
    return events.onSession(sessionId, event, handler);
  }, [event, handler, sessionId, events]);
}
