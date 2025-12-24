import { SipState } from "./types";
import { getInitialSipState, shallowEqual } from "./sipState";

export type SipStateListener = (state: SipState) => void;

export class SipStateStore {
  private state: SipState = getInitialSipState();
  private lastState: SipState = getInitialSipState();
  private listeners = new Set<SipStateListener>();
  private pendingState: Partial<SipState> | null = null;
  private updateScheduled = false;

  getState(): SipState {
    return this.state;
  }

  onChange(fn: SipStateListener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  subscribe(fn: SipStateListener): () => void {
    return this.onChange(fn);
  }

  setState(partial: Partial<SipState>) {
    if (!partial || Object.keys(partial).length === 0) return;
    const next = { ...this.state, ...partial };
    // Fast-path: if sessions reference unchanged and shallow contents equal, skip emit.
    if (next.sessions === this.lastState.sessions && shallowEqual(this.lastState, next)) {
      return;
    }
    this.state = next;
    this.lastState = next;
    this.emit();
  }

  batchSet(partial: Partial<SipState>) {
    this.pendingState = { ...this.pendingState, ...partial };
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      queueMicrotask(() => {
        if (this.pendingState) this.setState(this.pendingState);
        this.pendingState = null;
        this.updateScheduled = false;
      });
    }
  }

  reset(overrides: Partial<SipState> = {}) {
    this.setState({ ...getInitialSipState(), ...overrides });
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }
}
