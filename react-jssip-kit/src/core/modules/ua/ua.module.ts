import type { SipUserAgent } from "../../sip/user-agent";
import type { SipConfiguration, UAEventMap } from "../../sip/types";
import { createUAHandlers } from "./ua.handlers";

type UaModuleDeps = {
  userAgent: SipUserAgent;
  createHandlers: () => Partial<UAEventMap>;
};

export class UaModule {
  private readonly userAgent: SipUserAgent;
  private readonly uaHandlers: Partial<UAEventMap>;
  private readonly uaHandlerKeys: (keyof UAEventMap)[];

  constructor(deps: UaModuleDeps) {
    this.userAgent = deps.userAgent;
    this.uaHandlers = deps.createHandlers();
    this.uaHandlerKeys = Object.keys(this.uaHandlers) as (keyof UAEventMap)[];
  }

  start(
    uri: string,
    password: string,
    config: Omit<SipConfiguration, "debug">,
    debug?: boolean | string
  ) {
    this.userAgent.start(uri, password, config, { debug });
    this.attachHandlers();
  }

  stop() {
    this.detachHandlers();
    this.userAgent.stop();
  }

  register() {
    this.userAgent.register();
  }

  setDebug(debug?: boolean | string) {
    this.userAgent.setDebug(debug);
  }

  private attachHandlers() {
    const ua = this.userAgent.ua;
    if (!ua) return;

    this.detachHandlers();
    this.uaHandlerKeys.forEach((event) => {
      const handler = this.uaHandlers[event];
      if (handler) ua.on(event, handler);
    });
  }

  private detachHandlers() {
    const ua = this.userAgent.ua;
    if (!ua) return;
    this.uaHandlerKeys.forEach((event) => {
      const handler = this.uaHandlers[event];
      // jssip 3.13.x UA.d.ts only declares `on`; removeListener is
      // available at runtime via EventEmitter but not typed in the declaration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (handler) (ua as any).removeListener(event, handler);
    });
  }
}

export function createUaHandlers(deps: Parameters<typeof createUAHandlers>[0]) {
  return createUAHandlers(deps);
}
