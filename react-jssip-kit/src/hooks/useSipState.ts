import { useSyncExternalStore } from "react";
import type { SipState } from "../core/contracts/state";
import { useSipKernel } from "./useSip";

export function useSipState(): SipState {
  const { store } = useSipKernel();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
