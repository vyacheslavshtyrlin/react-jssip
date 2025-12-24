import { SipClient } from "../../sip/client";
import type { RTCSession } from "../../sip/types";
export declare function createCallPlayer(audioEl: HTMLAudioElement): {
    bindToSession: (session: RTCSession) => () => void;
    bindToClient: (client: SipClient) => () => void;
    detach: () => void;
};
