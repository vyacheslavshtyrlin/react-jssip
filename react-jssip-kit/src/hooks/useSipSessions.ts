import type { SipState } from "jssip-lib";
import { useSipState } from "./useSipState";

export function useSipSessions(): Pick<SipState, "sessions"> {
  const { sessions } = useSipState();
  return { sessions };
}
