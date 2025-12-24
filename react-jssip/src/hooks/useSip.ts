import { useContext } from "react";
import { SipContext } from "../context";

export function useSip() {
  const ctx = useContext(SipContext);
  if (!ctx) throw new Error("Must be used within SipProvider");
  return ctx;
}
