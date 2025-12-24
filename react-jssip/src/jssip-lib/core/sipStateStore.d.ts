import { SipState } from "./types";
export type SipStateListener = (state: SipState) => void;
export declare class SipStateStore {
    private state;
    private lastState;
    private listeners;
    private pendingState;
    private updateScheduled;
    getState(): SipState;
    onChange(fn: SipStateListener): () => void;
    subscribe(fn: SipStateListener): () => void;
    setState(partial: Partial<SipState>): void;
    batchSet(partial: Partial<SipState>): void;
    reset(overrides?: Partial<SipState>): void;
    private emit;
}
