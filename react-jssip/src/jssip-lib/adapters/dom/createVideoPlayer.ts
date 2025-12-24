import type { SipClient } from "../../sip/client";
import type { RTCSession, RTCSessionEvent } from "../../sip/types";

export function createVideoPlayer(videoEl: HTMLVideoElement) {
  const sinkStream = new MediaStream();
  videoEl.srcObject = sinkStream;
  videoEl.playsInline = true;

  let cleanupPCListeners: (() => void) | null = null;
  let cleanupSessionPeerListener: (() => void) | null = null;
  let cleanupClientListeners: (() => void) | null = null;

  const dispose = (fn: (() => void) | null) => {
    if (fn) fn();
    return null as null;
  };

  const clearSinkTracks = () => {
    for (const t of sinkStream.getTracks()) sinkStream.removeTrack(t);
  };

  const playIfPossible = () => {
    // Autoplay might still be blocked; that's fine.
    videoEl.play?.().catch(() => {});
  };

  const addVideoTrack = (track: MediaStreamTrack) => {
    if (track.kind !== "video") return;
    if (!sinkStream.getTracks().includes(track)) {
      sinkStream.addTrack(track);
    }
  };

  const attachTracks = (pc: RTCPeerConnection) => {
    if (typeof pc.getReceivers === "function") {
      const recvs = pc.getReceivers() ?? [];
      recvs.forEach((r) => r.track && addVideoTrack(r.track));
      if (recvs.length) playIfPossible();
    }

    const onTrack = (e: RTCTrackEvent) => {
      if (e.track.kind !== "video") return;

      const s = e.streams?.[0];
      if (s) s.getVideoTracks().forEach(addVideoTrack);
      else addVideoTrack(e.track);

      playIfPossible();
    };

    const onRemoveTrack = (
      e: MediaStreamTrackEvent & { receiver?: RTCRtpReceiver }
    ) => {
      const tr: MediaStreamTrack | undefined = e?.track ?? e?.receiver?.track;
      if (!tr || tr.kind !== "video") return;

      sinkStream.getTracks().forEach((t) => {
        if (t === tr) sinkStream.removeTrack(t);
      });
    };

    pc.addEventListener("track", onTrack);
    pc.addEventListener("removetrack", onRemoveTrack as EventListener);

    return () => {
      pc.removeEventListener("track", onTrack);
      pc.removeEventListener("removetrack", onRemoveTrack as EventListener);
    };
  };

  const replacePCListeners = (pc: RTCPeerConnection) => {
    cleanupPCListeners = dispose(cleanupPCListeners);
    cleanupPCListeners = attachTracks(pc);
  };

  const listenSessionPeerconnection = (session: RTCSession) => {
    const onPeer = (data: { peerconnection: RTCPeerConnection }) => {
      replacePCListeners(data.peerconnection);
    };
    session.on("peerconnection", onPeer);
    return () => session.off("peerconnection", onPeer);
  };

  function bindToSession(session: RTCSession) {
    if (
      session?.direction === "outgoing" &&
      session.connection instanceof RTCPeerConnection
    ) {
      replacePCListeners(session.connection);
    }

    cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
    cleanupSessionPeerListener = listenSessionPeerconnection(session);

    return () => {
      cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
      cleanupPCListeners = dispose(cleanupPCListeners);
    };
  }

  function bindToClient(client: SipClient) {
    const offNew = client.on("newRTCSession", (payload) => {
      const e = (payload as any)?.data as RTCSessionEvent | undefined;
      cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
      cleanupPCListeners = dispose(cleanupPCListeners);

      if (!e?.session) return;

      cleanupSessionPeerListener = listenSessionPeerconnection(e.session);
      if (
        e.session.direction === "outgoing" &&
        e.session.connection instanceof RTCPeerConnection
      ) {
        replacePCListeners(e.session.connection);
      }
    });

    const teardown = () => {
      cleanupSessionPeerListener = dispose(cleanupSessionPeerListener);
      cleanupPCListeners = dispose(cleanupPCListeners);
      clearSinkTracks();
      playIfPossible();
    };

    const offEnded = client.on("ended", teardown);
    const offFailed = client.on("failed", teardown);
    const offDisconnected = client.on("disconnected", teardown);

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
    cleanupPCListeners = dispose(cleanupPCListeners);
    clearSinkTracks();
  }

  return {
    bindToSession,
    bindToClient,
    detach,
  };
}
