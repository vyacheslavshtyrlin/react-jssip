import { useEffect, useRef } from "react";
import type { SessionIceFailedPayload } from "../core/sip/types";
import { useSipKernel } from "./useSip";

export function useSessionIceFailed(
  handler?: (payload: SessionIceFailedPayload) => void
) {
  const { events } = useSipKernel();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!handlerRef.current) return;
    return events.onSessionIceFailed((payload) =>
      handlerRef.current?.(payload)
    );
  }, [events]);
}
