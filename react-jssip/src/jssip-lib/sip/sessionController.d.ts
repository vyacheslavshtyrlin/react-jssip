import type { RTCSession, TerminateOptions, AnswerOptions, DTFMOptions, ReferOptions } from "jssip/lib/RTCSession";
export declare class WebRTCSessionController {
    currentSession: RTCSession | null;
    mediaStream: MediaStream | null;
    setSession(session: RTCSession | null): void;
    setMediaStream(stream: MediaStream): void;
    private getPC;
    cleanup(stopTracks?: boolean): void;
    answer(options?: AnswerOptions): boolean;
    hangup(options?: TerminateOptions): boolean;
    mute(): boolean;
    unmute(): boolean;
    hold(): boolean;
    unhold(): boolean;
    sendDTMF(tones: string | number, options?: DTFMOptions): boolean;
    transfer(target: string | RTCSession, options?: ReferOptions): boolean;
    attendedTransfer(otherSession: RTCSession): boolean;
    enableVideo(): void;
    disableVideo(): void;
    switchCamera(nextVideoTrack: MediaStreamTrack): Promise<boolean>;
}
