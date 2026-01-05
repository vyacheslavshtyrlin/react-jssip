import type { SipClient } from "../../sip/client";
import type { RTCSession } from "../../sip/types";
export declare function createVideoPlayer(videoEl: HTMLVideoElement): {
    bindToSession: (session: RTCSession) => () => void;
    bindToClient: (client: SipClient) => () => void;
    detach: () => void;
};
