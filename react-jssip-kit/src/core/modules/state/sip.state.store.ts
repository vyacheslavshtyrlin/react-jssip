import { InternalSipState, SipState } from "../../contracts/state";
import { getInitialSipState, shallowEqual } from "./sip.state";

export type SipStateListener = (state: InternalSipState) => void;
export type PublicSipStateListener = (state: SipState) => void;

export class SipStateStore {
  private state: InternalSipState = getInitialSipState();
  private lastState: InternalSipState = getInitialSipState();
  private listeners = new Set<SipStateListener>();
  private pendingState: Partial<InternalSipState> | null = null;
  private updateScheduled = false;

  getState(): InternalSipState {
    return this.state;
  }

  getPublicState(): SipState {
    return {
      sipStatus: this.state.sipStatus,
      error: this.state.error,
      sessions: this.state.sessions,
    };
  }

  onChange(fn: SipStateListener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  onPublicChange(fn: PublicSipStateListener): () => void {
    const wrapped = () => fn(this.getPublicState());
    wrapped();
    return this.onChange(() => wrapped());
  }

  subscribe(fn: PublicSipStateListener): () => void {
    return this.onPublicChange(fn);
  }

  subscribeInternal(fn: SipStateListener): () => void {
    return this.onChange(fn);
  }

  setState(partial: Partial<InternalSipState>) {
    if (!partial || Object.keys(partial).length === 0) return;
    const next = { ...this.state, ...partial };
    if (
      next.sessions === this.lastState.sessions &&
      shallowEqual(this.lastState, next)
    ) {
      return;
    }
    this.state = next;
    this.lastState = next;
    this.emit();
  }

  batchSet(partial: Partial<InternalSipState>) {
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

  reset(overrides: Partial<InternalSipState> = {}) {
    this.setState({ ...getInitialSipState(), ...overrides });
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }
}
