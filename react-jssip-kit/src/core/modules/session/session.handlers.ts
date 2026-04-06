import type { RTCSessionEventMap } from "../../sip/types";
import { CallStatus } from "../../contracts/state";
import type { StateAdapter } from "../../contracts/state";
import type { WebRTCSessionController } from "../media/webrtc-session.controller";
import type { JsSIPEventMap } from "../../sip/types";
import type { JssipEventEmitter } from "../event/event-target.emitter";
import {
  removeSessionState,
  upsertSessionState,
} from "./session.state.projector";
import { sipDebugLogger } from "../debug/sip-debug.logger";

import type {
  IncomingAckEvent,
  IncomingDTMFEvent,
  IncomingEvent,
  IncomingInfoEvent,
  OutgoingAckEvent,
  OutgoingDTMFEvent,
  OutgoingEvent,
  OutgoingInfoEvent,
  PeerConnectionEvent,
} from "jssip/src/RTCSession";

type Deps = {
  emitter: JssipEventEmitter<JsSIPEventMap>;
  state: StateAdapter;
  rtc: WebRTCSessionController;
  detachSessionHandlers: () => void;
  enableMicrophoneRecovery?: (sessionId: string) => void;
  holdOtherActiveSessions?: () => void;
  iceCandidateReadyDelayMs?: number;
  sessionId: string;
};

export function createSessionHandlers(deps: Deps): Partial<RTCSessionEventMap> {
  const {
    emitter,
    state,
    rtc,
    detachSessionHandlers,
    sessionId,
    iceCandidateReadyDelayMs,
    holdOtherActiveSessions,
  } = deps;
  let iceReadyCalled = false;
  let iceReadyTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionEnded = false;
  let iceFailedEmitted = false;
  let removeIceFailedListener: (() => void) | null = null;

  const clearIceReadyTimer = () => {
    if (!iceReadyTimer) return;
    clearTimeout(iceReadyTimer);
    iceReadyTimer = null;
  };
  const cleanupIceFailedListener = () => {
    removeIceFailedListener?.();
    removeIceFailedListener = null;
  };
  const cleanupSession = () => {
    sessionEnded = true;
    clearIceReadyTimer();
    cleanupIceFailedListener();
    detachSessionHandlers();
    rtc.cleanup();
    removeSessionState(state, sessionId);
  };
  if (typeof iceCandidateReadyDelayMs === "number") {
    sipDebugLogger.logIceReadyConfig(sessionId, iceCandidateReadyDelayMs);
  }

  return {
    progress: (e: IncomingEvent | OutgoingEvent) => {
      emitter.emit("progress", e);
      if (
        (e as any).originator === "remote" &&
        (e as any).response?.body
      ) {
        upsertSessionState(state, sessionId, {
          status: CallStatus.EarlyMedia,
        });
      }
    },
    accepted: (e: IncomingEvent | OutgoingEvent) => {
      emitter.emit("accepted", e);
      holdOtherActiveSessions?.();
      const existing = state.getState().sessionsById[sessionId];
      upsertSessionState(state, sessionId, {
        status: CallStatus.Active,
        acceptedAt: existing?.acceptedAt ?? Date.now(),
      });
    },
    confirmed: (e: IncomingAckEvent | OutgoingAckEvent) => {
      emitter.emit("confirmed", e);
      deps.enableMicrophoneRecovery?.(sessionId);
    },

    ended: (e) => {
      emitter.emit("ended", e);
      cleanupSession();
    },
    failed: (e) => {
      emitter.emit("failed", e);
      cleanupSession();
    },

    muted: (e) => {
      emitter.emit("muted", e);
      upsertSessionState(state, sessionId, { muted: true });
    },
    unmuted: (e) => {
      emitter.emit("unmuted", e);
      upsertSessionState(state, sessionId, { muted: false });
    },
    hold: (e) => {
      emitter.emit("hold", e);
      upsertSessionState(state, sessionId, { status: CallStatus.Hold });
    },
    unhold: (e) => {
      emitter.emit("unhold", e);
      holdOtherActiveSessions?.();
      upsertSessionState(state, sessionId, { status: CallStatus.Active });
    },

    reinvite: (e) => emitter.emit("reinvite", e),
    update: (e) => emitter.emit("update", e),
    sdp: (e) => emitter.emit("sdp", e),
    icecandidate: (e) => {
      const candidate = e?.candidate;
      const ready = typeof e?.ready === "function" ? e.ready : null;
      const delayMs =
        typeof iceCandidateReadyDelayMs === "number"
          ? iceCandidateReadyDelayMs
          : null;

      if (!iceReadyCalled && ready && delayMs != null) {
        const fireReady = (source: "srflx" | "timer" | "immediate") => {
          iceReadyCalled = true;
          sipDebugLogger.logIceReady(sessionId, {
            source,
            delayMs,
            candidateType: candidate?.type,
          });
          ready();
        };

        const isSrflx =
          candidate?.type === "srflx" &&
          candidate?.relatedAddress != null &&
          candidate?.relatedPort != null;

        if (isSrflx) {
          clearIceReadyTimer();
          fireReady("srflx");
        } else if (delayMs === 0) {
          fireReady("immediate");
        } else if (!iceReadyTimer) {
          iceReadyTimer = setTimeout(() => {
            iceReadyTimer = null;
            if (!iceReadyCalled) fireReady("timer");
          }, delayMs);
        }
      }

      emitter.emit("icecandidate", e);
    },
    refer: (e) => emitter.emit("refer", e),
    replaces: (e) => {
      emitter.emit("replaces", e);
      // Auto-accept the replacement: terminates the current session and starts
      // the new one. State updates flow through the subsequent ended /
      // newRTCSession events, so no manual state mutation is needed here.
      try {
        e?.accept?.();
      } catch {
        /* ignore accept errors */
      }
    },
    newDTMF: (e: IncomingDTMFEvent | OutgoingDTMFEvent) =>
      emitter.emit("newDTMF", e),
    newInfo: (e: OutgoingInfoEvent | IncomingInfoEvent) =>
      emitter.emit("newInfo", e),

    getusermediafailed: (e) => {
      emitter.emit("getusermediafailed", e);
      cleanupSession();
    },
    "peerconnection:createofferfailed": (e) => {
      emitter.emit("peerconnection:createofferfailed", e);
      cleanupSession();
    },
    "peerconnection:createanswerfailed": (e) => {
      emitter.emit("peerconnection:createanswerfailed", e);
      cleanupSession();
    },
    "peerconnection:setlocaldescriptionfailed": (e) => {
      emitter.emit("peerconnection:setlocaldescriptionfailed", e);
      cleanupSession();
    },
    "peerconnection:setremotedescriptionfailed": (e) => {
      emitter.emit("peerconnection:setremotedescriptionfailed", e);
      cleanupSession();
    },
    peerconnection: (e: PeerConnectionEvent) => {
      emitter.emit("peerconnection", e);
      const pc = (e as { peerconnection?: RTCPeerConnection }).peerconnection;
      if (!pc) return;
      cleanupIceFailedListener();
      const onIceStateChange = () => {
        if (sessionEnded || iceFailedEmitted) return;
        if (pc.iceConnectionState === "failed") {
          iceFailedEmitted = true;
          emitter.emit("sessionIceFailed", { sessionId });
        }
      };
      pc.addEventListener("iceconnectionstatechange", onIceStateChange);
      removeIceFailedListener = () =>
        pc.removeEventListener("iceconnectionstatechange", onIceStateChange);
    },
  };
}
