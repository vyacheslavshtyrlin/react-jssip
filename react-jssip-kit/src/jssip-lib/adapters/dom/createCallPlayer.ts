import { SipClient } from "../../sip/client";
import type { RTCSession, RTCSessionEvent } from "../../sip/types";

export function createCallPlayer(audioEl: HTMLAudioElement) {
  let cleanupTrackListener: (() => void) | null = null;
  let cleanupSessionPeerListener: (() => void) | null = null;
  let cleanupClientListeners: (() => void) | null = null;

  const dispose = (fn: (() => void) | null) => {
    if (fn) fn();
    return null as null;
  };

  /** Stop all tracks and clear audio element */
  function clearAudioStream(stream?: MediaStream | null) {
    if (stream) {
      for (const t of stream.getTracks()) {
        t.stop();
      }
    }
    audioEl.srcObject = null;
  }

  const attachTracks = (pc: RTCPeerConnection) => {
    const onTrack = (e: RTCTrackEvent) => {
      if (e.track.kind !== "audio") return;

      const nextStream = e.streams?.[0] ?? new MediaStream([e.track]);
      const prev = audioEl.srcObject as MediaStream | null;

      if (prev && prev !== nextStream) {
        clearAudioStream(prev);
      }

      audioEl.srcObject = nextStream;
      audioEl.play?.().catch(() => {});
    };

    pc.addEventListener("track", onTrack);
    return () => pc.removeEventListener("track", onTrack);
  };

  const listenSessionPeerconnection = (session: RTCSession) => {
    const onPeer = (data: { peerconnection: RTCPeerConnection }) => {
      cleanupTrackListener = dispose(cleanupTrackListener);
      cleanupTrackListener = attachTracks(data.peerconnection);
    };
    session.on("peerconnection", onPeer);
    return () => session.off("peerconnection", onPeer);
  };

  function bindToSession(session: RTCSession) {
    if (
      session?.direction === "outgoing" &&
      session.connection instanceof RTCPeerConnection
    ) {
      cleanupTrackListener = dispose(cleanupTrackListener);
      cleanupTrackListener = attachTracks(session.connection);
    }

    cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
    cleanupSessionPeerListener = listenSessionPeerconnection(session);

    return () => {
      cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
      cleanupTrackListener = dispose(cleanupTrackListener);
    };
  }

  function bindToClient(client: SipClient) {
    const offNew = client.on("newRTCSession", (payload) => {
      const e = (payload as any)?.data as RTCSessionEvent | undefined;
      cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
      cleanupTrackListener = dispose(cleanupTrackListener);

      if (!e?.session) return;

      cleanupSessionPeerListener = listenSessionPeerconnection(e.session);
      if (
        e.session.direction === "outgoing" &&
        e.session.connection instanceof RTCPeerConnection
      ) {
        cleanupTrackListener = attachTracks(e.session.connection);
      }
    });

    const offEnded = client.on("ended", () => detach());
    const offFailed = client.on("failed", () => detach());
    const offDisconnected = client.on("disconnected", () => detach());

    cleanupClientListeners = () => {
      offNew();
      offEnded();
      offFailed();
      offDisconnected();
    };
    return cleanupClientListeners;
  }

  function detach() {
    cleanupClientListeners = dispose(cleanupClientListeners);
    cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
    cleanupTrackListener = dispose(cleanupTrackListener);
    clearAudioStream(audioEl.srcObject as MediaStream | null);
  }

  return {
    bindToSession,
    bindToClient,
    detach,
  };
}
