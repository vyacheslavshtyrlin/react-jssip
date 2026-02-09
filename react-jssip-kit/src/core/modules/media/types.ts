import type { RTCSession } from "../../sip/types";

export type SessionMediaState = {
  sessionId: string;
  session: RTCSession | null;
  peerConnection: RTCPeerConnection | null;
  remoteStream: MediaStream | null;
  audioTracks: MediaStreamTrack[];
};

export interface MediaModule {
  getSession(sessionId: string): RTCSession | null;
  observePeerConnection(
    sessionId: string,
    onPeerConnection: (peerConnection: RTCPeerConnection | null) => void
  ): () => void;
  buildRemoteStream(peerConnection: RTCPeerConnection | null): MediaStream | null;
}
