import JsSIP from "jssip";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface SipDebugToggleResult {
  debug: boolean;
  text: string;
}

/**
 * Browser-friendly debugger toggle for JsSIP.
 * Persists preference in sessionStorage and exposes helpers on window for console use.
 */
export class SipDebugger {
  private readonly storageKey: string;
  private readonly defaultPattern: string;
  private enabled = false;
  private logger: any;

  constructor(storageKey = "sip-debug-enabled", defaultPattern = "JsSIP:*") {
    this.storageKey = storageKey;
    this.defaultPattern = defaultPattern;
  }

  initFromSession(storage: StorageLike | null = safeSessionStorage()): void {
    try {
      const saved = storage?.getItem(this.storageKey);
      if (saved === "true") {
        this.enable(this.defaultPattern, storage);
      } else if (saved) {
        storage?.removeItem?.(this.storageKey);
      }
    } catch {
      /* ignore */
    }
  }

  enable(
    pattern: string = this.defaultPattern,
    storage: StorageLike | null = safeSessionStorage()
  ): void {
    try {
      if (typeof JsSIP?.debug?.enable === "function") {
        JsSIP.debug.enable(pattern);
        this.logger = console;
      }
      storage?.setItem?.(this.storageKey, "true");
      try {
        (window as any).sipDebugBridge?.(true);
      } catch {
        /* ignore */
      }
      this.enabled = true;
    } catch {
      /* ignore */
    }
  }

  disable(storage: StorageLike | null = safeSessionStorage()): void {
    try {
      if (typeof JsSIP?.debug?.disable === "function") {
        JsSIP.debug.disable();
      } else if (typeof JsSIP?.debug?.enable === "function") {
        JsSIP.debug.enable("");
      }
      storage?.removeItem?.(this.storageKey);
      try {
        (window as any).sipDebugBridge?.(false);
      } catch {
        /* ignore */
      }
      this.enabled = false;
    } catch {
      /* ignore */
    }
  }

  toggle(
    pattern: string = this.defaultPattern,
    storage: StorageLike | null = safeSessionStorage()
  ): void {
    if (this.isEnabled()) {
      this.disable(storage);
    } else {
      this.enable(pattern, storage);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  attachToWindow(win: Window & typeof globalThis = window): void {
    const api = {
      enableDebug: (): SipDebugToggleResult => {
        this.enable();
        return { debug: this.isEnabled(), text: "press F5" };
      },
      disableDebug: (): SipDebugToggleResult => {
        this.disable();
        return { debug: this.isEnabled(), text: "press F5" };
      },
      toggleDebug: (): SipDebugToggleResult => {
        this.toggle();
        return { debug: this.isEnabled(), text: "press F5" };
      },
      debugState: (): SipDebugToggleResult => ({
        debug: this.isEnabled(),
        text: this.isEnabled() ? "enabled" : "disabled",
      }),
      sipState: () => {
        try {
          const getter = (win as any).sipState;
          return typeof getter === "function"
            ? getter()
            : "sipState helper not available; ensure client debug is enabled";
        } catch {
          return "sipState helper not available";
        }
      },
      sipSessions: () => {
        try {
          const getter = (win as any).sipSessions;
          return typeof getter === "function"
            ? getter()
            : "sipSessions helper not available; ensure client debug is enabled";
        } catch {
          return "sipSessions helper not available";
        }
      },
    };

    try {
      (win as any).sipSupport = api;
    } catch {
      /* ignore */
    }
  }
}

function safeSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const sipDebugger = new SipDebugger();
if (typeof window !== "undefined") {
  sipDebugger.attachToWindow();
  sipDebugger.initFromSession();
}
