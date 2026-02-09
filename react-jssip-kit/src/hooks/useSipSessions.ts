import { useMemo } from "react";
import type { SipState } from "../core/contracts/state";
import { useSipSelector } from "./useSipSelector";

export function useSipSessions(): Pick<SipState, "sessions"> {
  const sessions = useSipSelector((state) => state.sessions);
  return useMemo(() => ({ sessions }), [sessions]);
}
