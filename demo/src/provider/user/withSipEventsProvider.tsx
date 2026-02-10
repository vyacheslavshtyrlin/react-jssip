import React, { useRef } from "react";
import { useSipSessions, useSipEvent, CallPlayer } from "react-jssip-kit";
import RingDialog from "@/components/ring-dialog";

const ringSound = "/sounds/ring.mp3";

export default function withSipEventsProvider<P extends object>(
  Component: React.ComponentType<P>,
) {
  return function WithSipEventsComponent(props: P) {
    const { sessions } = useSipSessions();
    const audioRef = useRef<HTMLAudioElement>(null);

    const playAudio = (src: string) => {
      if (!audioRef.current) return;
      audioRef.current.src = src;
      audioRef.current.play();
    };

    useSipEvent("newRTCSession", (payload) => {
      const sessionId =
        (payload as any)?.session?.id ??
        (payload as any)?.sessionId ??
        (payload as any)?.data?.session?.id ??
        (payload as any)?.data?.id;
      const originator =
        (payload as any)?.originator ?? (payload as any)?.data?.originator;
      if (originator === "remote" && sessionId) {
        playAudio(ringSound);
      }
    });

    return (
      <>
        <audio playsInline ref={audioRef} />
        <RingDialog />
        {sessions.length === 0 ? (
          <CallPlayer />
        ) : (
          sessions.map((s) => <CallPlayer key={s.id} sessionId={s.id} />)
        )}
        <Component {...props} />
      </>
    );
  };
}
