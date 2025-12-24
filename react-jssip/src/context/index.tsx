import { createContext } from "react";
import type { SipClient } from "jssip-lib";
import type { SipEventManager } from "jssip-lib";

export type SipContextType = { client: SipClient, sipEventManager: SipEventManager };
export const SipContext = createContext<SipContextType | null>(null);
