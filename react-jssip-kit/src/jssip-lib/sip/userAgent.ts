import JsSIP, { UA } from "jssip";
import type { UAConfiguration } from "jssip/lib/UA";
import type { SipConfiguration } from "./types";

type StartOpts = { debug?: boolean | string };

export class SipUserAgent {
  private _ua: UA | null = null;

  public get ua(): UA | null {
    return this._ua;
  }
  public get isStarted(): boolean {
    return !!this._ua;
  }
  public get isRegistered(): boolean {
    return !!this._ua?.isRegistered();
  }

  public start(
    uri: string,
    password: string,
    config: Omit<SipConfiguration, "debug">,
    opts?: StartOpts
  ): UA {
    this.stop();
    const uaCfg = this.buildUAConfig(config, uri, password);
    this.ensureValid(uaCfg);
    this.applyDebug(opts?.debug);
    const ua = this.createUA(uaCfg);
    ua.start();
    this._ua = ua;
    return ua;
  }

  public register(): void {
    const ua = this.getUA();
    if (!ua?.isRegistered()) ua?.register();
  }

  public stop(): void {
    const ua = this._ua;
    if (!ua) return;
    try {
      if (ua.isRegistered()) ua.unregister();
      ua.stop();
    } finally {
      this._ua = null;
    }
  }

  public getUA(): UA | null {
    return this._ua;
  }

  public setDebug(debug?: boolean | string): void {
    this.applyDebug(debug);
  }

  protected buildUAConfig(
    config: Omit<SipConfiguration, "debug">,
    uri: string,
    password: string
  ): UAConfiguration {
    return { ...(config as UAConfiguration), uri, password };
  }

  protected ensureValid(cfg: UAConfiguration): void {
    const sockets = cfg.sockets as UAConfiguration["sockets"];
    if (
      !cfg.uri ||
      !cfg.password ||
      !sockets ||
      (Array.isArray(sockets) && sockets.length === 0)
    ) {
      throw new Error(
        "Invalid SIP connect args: require uri, password, and at least one socket"
      );
    }
  }

  protected applyDebug(debug?: boolean | string): void {
    const enabled = debug === undefined ? this.readSessionFlag() : !!debug;
    const pattern = typeof debug === "string" ? debug : "JsSIP:*";

    if (enabled) {
      JsSIP.debug.enable(pattern);
      const dbg: any = (JsSIP as any).debug;
      if (dbg?.setLogger) dbg.setLogger(console);
      else if (dbg) dbg.logger = console;
      this.persistSessionFlag();
    } else {
      (JsSIP.debug as any)?.disable?.();
      this.clearSessionFlag();
    }
  }

  protected createUA(cfg: UAConfiguration): UA {
    return new JsSIP.UA(cfg);
  }

  private readSessionFlag(): boolean {
    try {
      if (typeof window === "undefined") return false;
      return window.sessionStorage.getItem("sip-debug-enabled") === "true";
    } catch {
      return false;
    }
  }

  private persistSessionFlag(): void {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("sip-debug-enabled", "true");
      }
    } catch {
      /* ignore */
    }
  }

  private clearSessionFlag(): void {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("sip-debug-enabled");
      }
    } catch {
      /* ignore */
    }
  }
}
