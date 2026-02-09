import type {
  AnswerOptions,
  CallOptions,
  DTMFOptions,
  ReferOptions,
  SipConfiguration,
  TerminateOptions,
} from "../sip/types";

export interface IUaGateway {
  connect(uri: string, password: string, config: SipConfiguration): void;
  disconnect(): void;
  register(): void;
  setDebug(debug?: boolean | string): void;
}

export interface ISessionGateway {
  call(target: string, options?: CallOptions): void;
  answer(sessionId: string, options?: AnswerOptions): boolean;
  hangup(sessionId: string, options?: TerminateOptions): boolean;
  hangupAll(options?: TerminateOptions): boolean;
  toggleMute(sessionId?: string): boolean;
  toggleHold(sessionId?: string): boolean;
  sendDTMF(
    sessionId: string,
    tones: string | number,
    options?: DTMFOptions
  ): boolean;
  transfer(sessionId: string, target: string, options?: ReferOptions): boolean;
}

export interface IMediaGateway {
  setSessionMedia(sessionId: string, stream: MediaStream): void;
}
