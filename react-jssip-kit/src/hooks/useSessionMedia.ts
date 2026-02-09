import { useEffect, useMemo, useState } from "react";
import { useSipKernel } from "./useSip";
import { useSipSelector } from "./useSipSelector";
import type { SessionMediaState } from "../core/modules/media/types";
import { CallStatus } from "../core/contracts/state";

export function useSessionMedia(sessionId?: string): SessionMediaState {
  const { media } = useSipKernel();
  const { sessionIds, sessionsById } = useSipSelector(
    (state) => ({
      sessionIds: state.sessionIds,
      sessionsById: state.sessionsById,
    }),
    (prev, next) =>
      prev.sessionIds === next.sessionIds && prev.sessionsById === next.sessionsById
  );
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(
    null
  );
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const resolvedSessionId = useMemo(() => {
    if (sessionId) return sessionId;
    const activeId = sessionIds.find(
      (id) => sessionsById[id]?.status === CallStatus.Active
    );
    return activeId ?? sessionIds[0];
  }, [sessionId, sessionIds, sessionsById]);

  const session = useMemo(
    () => (resolvedSessionId ? media.getSession(resolvedSessionId) : null),
    [media, resolvedSessionId]
  );
  const sessionState = useMemo(() => {
    if (!resolvedSessionId) return null;
    return sessionsById[resolvedSessionId] ?? null;
  }, [sessionsById, resolvedSessionId]);

  useEffect(() => {
    if (!resolvedSessionId) {
      setPeerConnection(null);
      setRemoteStream(null);
      return;
    }

    const off = media.observePeerConnection(resolvedSessionId, (pc) => {
      setPeerConnection(pc);
      setRemoteStream(media.buildRemoteStream(pc));
    });
    return off;
  }, [media, resolvedSessionId]);

  useEffect(() => {
    if (!peerConnection) {
      setRemoteStream(null);
      return;
    }

    const update = () => {
      setRemoteStream(media.buildRemoteStream(peerConnection));
    };

    peerConnection.addEventListener("track", update);
    peerConnection.addEventListener("connectionstatechange", update);
    peerConnection.addEventListener("iceconnectionstatechange", update);
    update();

    return () => {
      peerConnection.removeEventListener("track", update);
      peerConnection.removeEventListener("connectionstatechange", update);
      peerConnection.removeEventListener("iceconnectionstatechange", update);
    };
  }, [media, peerConnection]);

  const tracks = remoteStream?.getTracks() ?? [];
  const audioTracks = tracks.filter((track) => track.kind === "audio");

  if (!sessionState) {
    return {
      sessionId: resolvedSessionId ?? "",
      session,
      peerConnection,
      remoteStream,
      audioTracks,
    };
  }

  return {
    sessionId: sessionState.id,
    session,
    peerConnection,
    remoteStream,
    audioTracks,
  };
}
