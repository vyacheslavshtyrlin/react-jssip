import { useEffect, useRef } from "react";
import { useSip } from "../hooks/useSip";
import { createCallPlayer } from "jssip-lib/dom";

export function CallPlayer({ sessionId }: { sessionId?: string }) {
  const { client } = useSip();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const player = createCallPlayer(audioRef.current);
    const session = sessionId ? client.getSession(sessionId) : null;
    const off = session
      ? player.bindToSession(session)
      : player.bindToClient(client);

    return () => {
      off?.();
      player.detach();
    };
  }, [client, sessionId]);

  return <audio ref={audioRef} autoPlay playsInline />;
}
