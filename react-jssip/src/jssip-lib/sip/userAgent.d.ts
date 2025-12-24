import { UA } from "jssip";
import type { UAConfiguration } from "jssip/lib/UA";
import type { SipConfiguration } from "./types";
type StartOpts = {
    debug?: boolean | string;
};
export declare class SipUserAgent {
    private _ua;
    get ua(): UA | null;
    get isStarted(): boolean;
    get isRegistered(): boolean;
    start(uri: string, password: string, config: Omit<SipConfiguration, "debug">, opts?: StartOpts): UA;
    register(): void;
    stop(): void;
    getUA(): UA | null;
    setDebug(debug?: boolean | string): void;
    protected buildUAConfig(config: Omit<SipConfiguration, "debug">, uri: string, password: string): UAConfiguration;
    protected ensureValid(cfg: UAConfiguration): void;
    protected applyDebug(debug?: boolean | string): void;
    protected createUA(cfg: UAConfiguration): UA;
}
export {};
