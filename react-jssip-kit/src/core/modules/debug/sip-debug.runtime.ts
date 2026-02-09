import type { SipState } from "../../contracts/state";

const SESSION_DEBUG_KEY = "sip-debug-enabled";

type DebugRuntimeDeps = {
  getState: () => SipState;
  onChange: (listener: (state: SipState) => void) => () => void;
  getSessions: () => unknown;
  setDebugEnabled: (enabled: boolean) => void;
};

export class SipDebugRuntime {
  private readonly deps: DebugRuntimeDeps;
  private stateLogOff?: () => void;

  constructor(deps: DebugRuntimeDeps) {
    this.deps = deps;
  }

  attachBridge(setDebug: (debug?: boolean | string) => void): void {
    if (typeof window === "undefined") return;
    (window as any).sipDebugBridge = (debug?: boolean | string) =>
      setDebug(debug ?? true);
  }

  getPersistedDebug(): boolean | string | undefined {
    if (typeof window === "undefined") return undefined;
    try {
      const persisted = window.sessionStorage.getItem(SESSION_DEBUG_KEY);
      if (!persisted) return undefined;
      return persisted;
    } catch {
      return undefined;
    }
  }

  syncInspector(effectiveDebug?: boolean | string): void {
    if (typeof window === "undefined") return;

    const enabled = Boolean(effectiveDebug);
    this.deps.setDebugEnabled(enabled);
    this.toggleStateLogger(enabled);

    const win = window as any;
    const disabledInspector = () => {
      console.warn("SIP debug inspector disabled; enable debug to inspect.");
      return null;
    };

    win.sipState = () => (enabled ? this.deps.getState() : disabledInspector());
    win.sipSessions = () =>
      enabled ? this.deps.getSessions() : disabledInspector();
  }

  cleanup(): void {
    this.toggleStateLogger(false);
  }

  private toggleStateLogger(enabled: boolean): void {
    if (!enabled) {
      this.stateLogOff?.();
      this.stateLogOff = undefined;
      return;
    }
    if (this.stateLogOff) return;

    let prev = this.deps.getState();
    console.info("[sip][state]", { initial: true }, prev);

    this.stateLogOff = this.deps.onChange((next) => {
      console.info("[sip][state]", next);
      prev = next;
    });
  }
}
