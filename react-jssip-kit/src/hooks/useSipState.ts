import { useCallback, useSyncExternalStore } from "react";
import type { SipState } from "jssip-lib";
import { useSip } from "./useSip";

export function useSipState(): SipState {
  const { client } = useSip();
  const subscribe = useCallback(
    (onStoreChange: () => void) => client.onChange(onStoreChange),
    [client]
  );

  console.log(client.state)

  const getSnapshot = useCallback(() => client.state, [client]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
