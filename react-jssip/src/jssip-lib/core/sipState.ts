import { SipState, SipStatus } from "./types";

export function getInitialSipState(): SipState {
  return {
    sipStatus: SipStatus.Disconnected,
    error: null,
    sessions: [],
  };
}

export function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) return true;
  if (!objA || !objB) return false;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }
  return true;
}
