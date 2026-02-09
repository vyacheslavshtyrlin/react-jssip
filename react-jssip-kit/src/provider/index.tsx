import React, { useMemo } from "react";
import { SipContext } from "../context";
import type { SipKernel } from "../core/kernel";

export type SipProviderProps = {
  kernel: SipKernel;
  children: React.ReactNode;
};

export function SipProvider(props: SipProviderProps) {
  const contextValue = useMemo(() => props.kernel, [props.kernel]);

  return (
    <SipContext.Provider value={contextValue}>
      {props.children}
    </SipContext.Provider>
  );
}
