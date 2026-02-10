import { useEffect, useRef } from "react";
import { useSessionMedia } from "../hooks/useSessionMedia";

export function CallPlayer({ sessionId }: { sessionId?: string }) {
  const { remoteStream } = useSessionMedia(sessionId);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.srcObject = remoteStream;
    audioEl.play?.().catch(() => {});
    return () => {
      audioEl.srcObject = null;
    };
  }, [remoteStream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}
