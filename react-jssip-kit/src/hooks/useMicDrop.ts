import { useEffect, useRef } from "react";
import type { MicDropPayload } from "../core/sip/types";
import { useSipKernel } from "./useSip";

export function useMicDrop(handler?: (payload: MicDropPayload) => void) {
  const { events } = useSipKernel();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const hasHandler = !!handler;

  useEffect(() => {
    if (!hasHandler) return;
    return events.onMicDrop((payload) => handlerRef.current?.(payload));
  }, [events, hasHandler]);
}
