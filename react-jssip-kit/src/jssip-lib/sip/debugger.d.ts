type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface SipDebugToggleResult {
    debug: boolean;
    text: string;
}
/**
 * Browser-friendly debugger toggle for JsSIP.
 * Persists preference in sessionStorage and exposes helpers on window for console use.
 */
export declare class SipDebugger {
    private readonly storageKey;
    private readonly defaultPattern;
    private enabled;
    constructor(storageKey?: string, defaultPattern?: string);
    initFromSession(storage?: StorageLike | null): void;
    enable(pattern?: string, storage?: StorageLike | null): void;
    disable(storage?: StorageLike | null): void;
    toggle(pattern?: string, storage?: StorageLike | null): void;
    isEnabled(): boolean;
    attachToWindow(win?: Window & typeof globalThis): void;
}
export declare const sipDebugger: SipDebugger;
export {};
