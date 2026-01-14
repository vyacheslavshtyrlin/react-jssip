import { EndEvent, RTCSessionEventMap } from "../types";
import { CallStatus } from "../../core/types";
import { SipStateStore } from "../../core/sipStateStore";
import { WebRTCSessionController } from "../sessionController";
import { JsSIPEventMap } from "../types";
import { EventTargetEmitter } from "../../core/eventEmitter";
import { SipErrorPayload } from "../../core/sipErrorHandler";
import { upsertSessionState } from "../sessionState";
import { IncomingAckEvent, IncomingEvent, OutgoingAckEvent, OutgoingEvent } from "jssip/src/RTCSession";

type Deps = {
  emitter: EventTargetEmitter<JsSIPEventMap>;
  state: SipStateStore;
  rtc: WebRTCSessionController;
  detachSessionHandlers: () => void;
  emitError: (raw: any, code?: string, fallback?: string) => SipErrorPayload;
  onSessionFailed: (error?: string, event?: any) => void;
  sessionId: string;
};

export function createSessionHandlers(deps: Deps): Partial<RTCSessionEventMap> {
  const {
    emitter,
    state,
    rtc,
    detachSessionHandlers,
    onSessionFailed,
    sessionId,
  } = deps;

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
            : s
        ),
      });
    },
    confirmed: (e: IncomingAckEvent | OutgoingAckEvent) =>
      emitter.emit("confirmed", e),

    ended: (e: EndEvent) => {
      emitter.emit("ended", e);
      detachSessionHandlers();
      rtc.cleanup();
      const nextSessions = state
        .getState()
        .sessions.filter((s) => s.id !== sessionId);
      state.batchSet({
        sessions: nextSessions,
      });
    },
    failed: (e: EndEvent) => {
      emitter.emit("failed", e);
      detachSessionHandlers();
      rtc.cleanup();
      const cause = e?.cause || "call failed";
      onSessionFailed(cause, e);
      const nextSessions = state
        .getState()
        .sessions.filter((s) => s.id !== sessionId);
      state.batchSet({
        sessions: nextSessions,
      });
    },

    muted: () => {
      emitter.emit("muted", undefined);
      upsertSessionState(state, sessionId, { muted: true });
    },
    unmuted: () => {
      emitter.emit("unmuted", undefined);
      upsertSessionState(state, sessionId, { muted: false });
    },
    hold: () => {
      emitter.emit("hold", undefined);
      upsertSessionState(state, sessionId, { status: CallStatus.Hold });
    },
    unhold: () => {
      emitter.emit("unhold", undefined);
      upsertSessionState(state, sessionId, { status: CallStatus.Active });
    },

    reinvite: (e: any) => emitter.emit("reinvite", e),
    update: (e: any) => emitter.emit("update", e),
    sdp: (e: any) => emitter.emit("sdp", e),
    icecandidate: (e: any) => emitter.emit("icecandidate", e),
    refer: (e: any) => emitter.emit("refer", e),
    replaces: (e: any) => emitter.emit("replaces", e),
    newDTMF: (e: any) => emitter.emit("newDTMF", e),
    newInfo: (e: any) => emitter.emit("newInfo", e),

    getusermediafailed: (e: any) => {
      emitter.emit("getusermediafailed", e);
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("getUserMedia failed", e);
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:createofferfailed": (e: any) => {
      emitter.emit("peerconnection:createofferfailed", e);
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection createOffer failed", e);
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:createanswerfailed": (e: any) => {
      emitter.emit("peerconnection:createanswerfailed", e);
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection createAnswer failed", e);
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:setlocaldescriptionfailed": (e: any) => {
      emitter.emit("peerconnection:setlocaldescriptionfailed", e);
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection setLocalDescription failed", e);
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:setremotedescriptionfailed": (e: any) => {
      emitter.emit("peerconnection:setremotedescriptionfailed", e);
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection setRemoteDescription failed", e);
      state.batchSet({
        sessions: state.getState().sessions.filter((s) => s.id !== sessionId),
      });
    },
    peerconnection: (e: any) => emitter.emit("peerconnection", e),
  };
}
