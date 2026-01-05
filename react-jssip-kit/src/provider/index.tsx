import React, { useMemo } from "react";
import { SipContext } from "../context";
import { createSipEventManager, type SipClient, type SipEventManager } from "jssip-lib";

export function SipProvider({
  client,
  children,
  sipEventManager,
}: {
  sipEventManager?: SipEventManager;
  client: SipClient;
  children: React.ReactNode;
}) {
  const manager = useMemo(
    () => sipEventManager ?? createSipEventManager(client),
    [client, sipEventManager]
  );

  const contextValue = useMemo(() => ({ client, sipEventManager: manager }), [client, manager]);

  return (
    <SipContext.Provider value={contextValue}>
      {children}
    </SipContext.Provider>
  );
}
