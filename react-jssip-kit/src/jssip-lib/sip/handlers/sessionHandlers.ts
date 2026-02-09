import { EndEvent, RTCSessionEventMap } from "../types";
import { CallStatus } from "../../core/types";
import { SipStateStore } from "../../core/sipStateStore";
import { WebRTCSessionController } from "../sessionController";
import { JsSIPEventMap } from "../types";
import { EventTargetEmitter } from "../../core/eventEmitter";
import { upsertSessionState } from "../sessionState";
import { sipDebugLogger } from "../debugLogging";

import {
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
  emitter: EventTargetEmitter<JsSIPEventMap>;
  state: SipStateStore;
  rtc: WebRTCSessionController;
  detachSessionHandlers: () => void;
  enableMicrophoneRecovery?: (sessionId: string) => void;
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
  } = deps;
  let iceReadyCalled = false;
  let iceReadyTimer: ReturnType<typeof setTimeout> | null = null;
  const clearIceReadyTimer = () => {
    if (!iceReadyTimer) return;
    clearTimeout(iceReadyTimer);
    iceReadyTimer = null;
  };
  if (typeof iceCandidateReadyDelayMs === "number") {
    sipDebugLogger.logIceReadyConfig(sessionId, iceCandidateReadyDelayMs);
  }

  return {
    progress: (e: IncomingEvent | OutgoingEvent) => {
      emitter.emit("progress", e);
    },
    accepted: (e: IncomingEvent | OutgoingEvent) => {
      emitter.emit("accepted", e);
      state.batchSet({
        sessions: state.getState().sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: CallStatus.Active,
                acceptedAt: s.acceptedAt ?? Date.now(),
              }
            : s,
        ),
      });
    },
    confirmed: (e: IncomingAckEvent | OutgoingAckEvent) => {
      emitter.emit("confirmed", e);
      deps.enableMicrophoneRecovery?.(sessionId);
    },

    ended: (e) => {
      emitter.emit("ended", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      const nextSessions = state
        .getState()
        .sessions.filter((s) => s.id !== sessionId);
      state.batchSet({
        sessions: nextSessions,
      });
    },
    failed: (e) => {
      emitter.emit("failed", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      const nextSessions = state
        .getState()
        .sessions.filter((s) => s.id !== sessionId);

      state.batchSet({
        sessions: nextSessions,
      });
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
        if (
          candidate?.type === "srflx" &&
          candidate?.relatedAddress != null &&
          candidate?.relatedPort != null
        ) {
          iceReadyCalled = true;
          if (iceReadyTimer) {
            clearTimeout(iceReadyTimer);
            iceReadyTimer = null;
          }
          sipDebugLogger.logIceReady(sessionId, {
            source: "srflx",
            delayMs,
            candidateType: candidate?.type,
          });
          ready();
        } else if (!iceReadyTimer && delayMs > 0) {
          iceReadyTimer = setTimeout(() => {
            iceReadyTimer = null;
            if (iceReadyCalled) return;
            iceReadyCalled = true;
            sipDebugLogger.logIceReady(sessionId, {
              source: "timer",
              delayMs,
              candidateType: candidate?.type,
            });
            ready();
          }, delayMs);
        } else if (delayMs === 0) {
          iceReadyCalled = true;
          sipDebugLogger.logIceReady(sessionId, {
            source: "immediate",
            delayMs,
            candidateType: candidate?.type,
          });
          ready();
        }
      }
      emitter.emit("icecandidate", e);
    },
    refer: (e) => emitter.emit("refer", e),
    replaces: (e) => emitter.emit("replaces", e),
    newDTMF: (e: IncomingDTMFEvent | OutgoingDTMFEvent) =>
      emitter.emit("newDTMF", e),
    newInfo: (e: OutgoingInfoEvent | IncomingInfoEvent) =>
      emitter.emit("newInfo", e),

    getusermediafailed: (e) => {
      emitter.emit("getusermediafailed", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:createofferfailed": (e) => {
      emitter.emit("peerconnection:createofferfailed", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:createanswerfailed": (e) => {
      emitter.emit("peerconnection:createanswerfailed", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:setlocaldescriptionfailed": (e) => {
      emitter.emit("peerconnection:setlocaldescriptionfailed", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:setremotedescriptionfailed": (e) => {
      emitter.emit("peerconnection:setremotedescriptionfailed", e);
      clearIceReadyTimer();
      detachSessionHandlers();
      rtc.cleanup();
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    peerconnection: (e: PeerConnectionEvent) => emitter.emit("peerconnection", e),
  };
}
