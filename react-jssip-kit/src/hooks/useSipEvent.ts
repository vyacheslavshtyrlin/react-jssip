import { useEffect, useRef } from "react";
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
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!handlerRef.current) return;
    return events.onUA(event, (...args) => handlerRef.current?.(...args));
  }, [event, events]);
}

export function useSipSessionEvent<K extends SessionEventName>(
  sessionId: string,
  event: K,
  handler?: (payload?: SessionEventPayload<K>) => void
) {
  const { events } = useSipKernel();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!handlerRef.current) return;
    return events.onSession(sessionId, event, (...args) =>
      handlerRef.current?.(...args)
    );
  }, [event, sessionId, events]);
}
