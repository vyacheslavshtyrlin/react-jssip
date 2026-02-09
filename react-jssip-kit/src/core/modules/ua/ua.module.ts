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
      if (handler) ua.on(event, handler as any);
    });
  }

  private detachHandlers() {
    const ua = this.userAgent.ua;
    if (!ua) return;
    this.uaHandlerKeys.forEach((event) => {
      const handler = this.uaHandlers[event];
      if (handler) ua.off(event, handler as any);
    });
  }
}

export function createUaHandlers(deps: Parameters<typeof createUAHandlers>[0]) {
  return createUAHandlers(deps);
}

