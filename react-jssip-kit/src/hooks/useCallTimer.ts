import { useEffect, useRef, useState } from "react";
import { CallStatus } from "../core/contracts/state";
import { useSipInternalSelector } from "./useSipInternalSelector";

export function useCallTimer(sessionId?: string): number | null {
  const acceptedAt = useSipInternalSelector((state) => {
    if (sessionId) {
      return state.sessionsById[sessionId]?.acceptedAt ?? null;
    }
    const activeId = state.sessionIds.find(
      (id) => state.sessionsById[id]?.status === CallStatus.Active
    );
    const resolvedId = activeId ?? state.sessionIds[0];
    return resolvedId
      ? (state.sessionsById[resolvedId]?.acceptedAt ?? null)
      : null;
  });

  const [elapsed, setElapsed] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (acceptedAt === null) {
      setElapsed(null);
      return;
    }

    const calc = () => Math.floor((Date.now() - acceptedAt) / 1000);
    setElapsed(calc());
    intervalRef.current = setInterval(() => setElapsed(calc()), 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [acceptedAt]);

  return elapsed;
}
