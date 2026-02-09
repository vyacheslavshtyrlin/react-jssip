import { useRef, useSyncExternalStore } from "react";
import type { SipState } from "../core/contracts/state";
import { useSipKernel } from "./useSip";

export type SipSelector<TSelected> = (state: SipState) => TSelected;
export type SipSelectorEqualityFn<TSelected> = (
  prev: TSelected,
  next: TSelected
) => boolean;

export function useSipSelector<TSelected>(
  selector: SipSelector<TSelected>,
  equalityFn: SipSelectorEqualityFn<TSelected> = Object.is
): TSelected {
  const { store } = useSipKernel();
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  const selectedRef = useRef<TSelected | undefined>(undefined);
  const hasSelectedRef = useRef(false);

  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  const getSelection = () => {
    const nextSelected = selectorRef.current(store.getState());
    if (
      hasSelectedRef.current &&
      equalityFnRef.current(selectedRef.current as TSelected, nextSelected)
    ) {
      return selectedRef.current as TSelected;
    }
    hasSelectedRef.current = true;
    selectedRef.current = nextSelected;
    return nextSelected;
  };

  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}
