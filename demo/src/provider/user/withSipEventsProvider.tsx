import React, { useEffect, useRef } from "react";
import { useSipSessions, CallPlayer } from "react-jssip-kit";

const ringSound = "/sounds/ring.mp3";

export default function withSipEventsProvider<P extends object>(
  Component: React.ComponentType<P>,
) {
  return function WithSipEventsComponent(props: P) {
    const { sessions } = useSipSessions();
    const audioRef = useRef<HTMLAudioElement>(null);

    const seenIdsRef = useRef(new Set(sessions.map((s) => s.id)));
    useEffect(() => {
      for (const session of sessions) {
        if (!seenIdsRef.current.has(session.id) && session.direction === "remote") {
          if (audioRef.current) {
            audioRef.current.src = ringSound;
            audioRef.current.play();
          }
        }
      }
      seenIdsRef.current = new Set(sessions.map((s) => s.id));
    }, [sessions]);

    return (
      <>
        <audio playsInline ref={audioRef} />
        {sessions.map((s) => <CallPlayer key={s.id} sessionId={s.id} />)}
        <Component {...props} />
      </>
    );
  };
}
