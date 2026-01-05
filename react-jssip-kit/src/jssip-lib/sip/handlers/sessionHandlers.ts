import { EndEvent, RTCSessionEventMap } from "../types";
import { CallStatus } from "../../core/types";
import { SipStateStore } from "../../core/sipStateStore";
import { WebRTCSessionController } from "../sessionController";
import { JsSIPEventMap } from "../types";
import { EventTargetEmitter } from "../../core/eventEmitter";
import { SipErrorPayload } from "../../core/sipErrorHandler";
import { upsertSessionState } from "../sessionState";

type Deps = {
  emitter: EventTargetEmitter<JsSIPEventMap>;
  state: SipStateStore;
  rtc: WebRTCSessionController;
  detachSessionHandlers: () => void;
  emitError: (
    raw: any,
    code?: string,
    fallback?: string
  ) => SipErrorPayload;
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
    progress: (e: any) => {
      emitter.emit("progress", { sessionId, data: e });
      state.batchSet({
        sessions: state.getState().sessions.map((s) =>
          s.id === sessionId ? { ...s, status: CallStatus.Ringing } : s
        ),
      });
    },
    accepted: (e: any) => {
      emitter.emit("accepted", { sessionId, data: e });
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
    confirmed: (e: any) => emitter.emit("confirmed", { sessionId, data: e }),

    ended: (e: any) => {
      emitter.emit("ended", { sessionId, data: e });
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
      emitter.emit("failed", { sessionId, data: e });
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
      emitter.emit("muted", { sessionId, data: undefined });
      upsertSessionState(state, sessionId, { muted: true });
    },
    unmuted: () => {
      emitter.emit("unmuted", { sessionId, data: undefined });
      upsertSessionState(state, sessionId, { muted: false });
    },
    hold: () => {
      emitter.emit("hold", { sessionId, data: undefined as any });
      upsertSessionState(state, sessionId, { status: CallStatus.Hold });
    },
    unhold: () => {
      emitter.emit("unhold", { sessionId, data: undefined as any });
      upsertSessionState(state, sessionId, { status: CallStatus.Active });
    },

    reinvite: (e: any) => emitter.emit("reinvite", { sessionId, data: e }),
    update: (e: any) => emitter.emit("update", { sessionId, data: e }),
    sdp: (e: any) => emitter.emit("sdp", { sessionId, data: e }),
    icecandidate: (e: any) => emitter.emit("icecandidate", { sessionId, data: e }),
    refer: (e: any) => emitter.emit("refer", { sessionId, data: e }),
    replaces: (e: any) => emitter.emit("replaces", { sessionId, data: e }),
    newDTMF: (e: any) => emitter.emit("newDTMF", { sessionId, data: e }),
    newInfo: (e: any) => emitter.emit("newInfo", { sessionId, data: e }),

    getusermediafailed: (e: any) => {
      emitter.emit("getusermediafailed", { sessionId, data: e });
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("getUserMedia failed", e);
      state.batchSet({
        sessions: state
          .getState()
          .sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:createofferfailed": (e: any) => {
      emitter.emit("peerconnection:createofferfailed", { sessionId, data: e });
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection createOffer failed", e);
      state.batchSet({
        sessions: state
          .getState()
          .sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:createanswerfailed": (e: any) => {
      emitter.emit("peerconnection:createanswerfailed", { sessionId, data: e });
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection createAnswer failed", e);
      state.batchSet({
        sessions: state
          .getState()
          .sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:setlocaldescriptionfailed": (e: any) => {
      emitter.emit("peerconnection:setlocaldescriptionfailed", { sessionId, data: e });
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection setLocalDescription failed", e);
      state.batchSet({
        sessions: state
          .getState()
          .sessions.filter((s) => s.id !== sessionId),
      });
    },
    "peerconnection:setremotedescriptionfailed": (e: any) => {
      emitter.emit("peerconnection:setremotedescriptionfailed", { sessionId, data: e });
      detachSessionHandlers();
      rtc.cleanup();
      onSessionFailed("peer connection setRemoteDescription failed", e);
      state.batchSet({
        sessions: state
          .getState()
          .sessions.filter((s) => s.id !== sessionId),
      });
    },
    peerconnection: (e: any) => emitter.emit("peerconnection", { sessionId, data: e }),
  };
}
