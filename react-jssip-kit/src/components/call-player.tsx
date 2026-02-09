import { useEffect, useRef } from "react";
import { useSessionMedia } from "../hooks/useSessionMedia";

export function CallPlayer({ sessionId }: { sessionId?: string }) {
  const { remoteStream } = useSessionMedia(sessionId);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = remoteStream;
    audioRef.current.play?.().catch(() => {});
    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}
