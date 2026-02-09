import {
  createSipClientInstance,
} from "../client";
import type {
  AnswerOptions,
  CallOptions,
  DTMFOptions,
  ReferOptions,
  SipConfiguration,
  TerminateOptions,
} from "../sip/types";
import type { SipKernel } from "./types";
import { createMediaModule } from "../modules/media/media.module";
import { createSipEventManager } from "../modules/event/sip-event-manager.adapter";

export function createSipKernel(): SipKernel {
  const client = createSipClientInstance();
  const eventManager = createSipEventManager(client);
  const media = createMediaModule({ client, eventManager });

  return {
    client,
    store: {
      getState: () => client.state,
      subscribe: (onStoreChange) => client.onChange(onStoreChange),
    },
    commands: {
      connect: (uri: string, password: string, config: SipConfiguration) =>
        client.connect(uri, password, config),
      disconnect: () => client.disconnect(),
      register: () => client.registerUA(),
      setDebug: (debug?: boolean | string) => client.setDebug(debug),
      call: (target: string, options?: CallOptions) => client.call(target, options),
      answer: (sessionId: string, options?: AnswerOptions) =>
        client.answerSession(sessionId, options),
      hangup: (sessionId: string, options?: TerminateOptions) =>
        client.hangupSession(sessionId, options),
      hangupAll: (options?: TerminateOptions) => client.hangupAll(options),
      toggleMute: (sessionId?: string) => client.toggleMuteSession(sessionId),
      toggleHold: (sessionId?: string) => client.toggleHoldSession(sessionId),
      sendDTMF: (
        sessionId: string,
        tones: string | number,
        options?: DTMFOptions
      ) => client.sendDTMFSession(sessionId, tones, options),
      transfer: (sessionId: string, target: string, options?: ReferOptions) =>
        client.transferSession(sessionId, target, options),
      getSession: (sessionId: string) => client.getSession(sessionId),
      getSessionIds: () => client.getSessionIds(),
      getSessions: () => client.getSessions(),
      setSessionMedia: (sessionId: string, stream: MediaStream) =>
        client.setSessionMedia(sessionId, stream),
    },
    events: {
      onUA: (event, handler) => eventManager.onUA(event, handler as any),
      onSession: (sessionId, event, handler) =>
        eventManager.onSession(sessionId, event, handler as any),
    },
    eventManager,
    media,
  };
}
