import { createContext } from "react";
import type { SipKernel } from "../core/kernel/types";

export type SipContextType = SipKernel;
export const SipContext = createContext<SipContextType | null>(null);
