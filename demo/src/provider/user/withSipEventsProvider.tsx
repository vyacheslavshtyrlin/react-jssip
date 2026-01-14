import React, { useRef, useState } from "react";
import {
  useSipSessions,
  useSipEvent,
  useSipSessionEvent,
  CallPlayer,
} from "react-jssip-kit";
import RingDialog from "@/components/ring-dialog";
import { toast } from "sonner";

const ringSound = "/sounds/ring.mp3";
const acceptedSound = "/sounds/accepted.mp3";
const endedSound = "/sounds/error.mp3";

export default function withSipEventsProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithSipEventsComponent(props: P) {
    const { sessions } = useSipSessions();
    const [incomingSession, setIncomingSession] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const playAudio = (src: string) => {
      if (!audioRef.current) return;
      audioRef.current.src = src;
      audioRef.current.play();
    };

    const stopAudio = () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.currentTime = 0;
    };

    const notify = (
      src: string,
      opts: { clearIncoming?: boolean; toastMessage?: string } = {}
    ) => {
      stopAudio();
      playAudio(src);
      if (opts.clearIncoming) setIncomingSession(null);
      if (opts.toastMessage) toast.error(opts.toastMessage);
    };

    const dialogOpen = sessions.some((s) => s.status !== "idle");

    useSipEvent("newRTCSession", (payload) => {
      const sessionId =
        (payload as any)?.sessionId ??
        (payload as any)?.data?.session?.id ??
        (payload as any)?.data?.id;
      const originator = (payload as any)?.data?.originator;

      if (originator === "remote" && sessionId) {
        setIncomingSession(String(sessionId));
        playAudio(ringSound);
      }
    });


    useSipEvent("missed", (e) => {
      const from = (e as any)?.data?.request?.from?.uri?.user ?? "";
      toast.info(`Missed call from ${from}`);
    });

    useSipEvent("error", (e) =>
      toast.error((e as any)?.cause || (e as any)?.data?.cause || "error")
    );

    return (
      <>
        <audio playsInline ref={audioRef} />
        <RingDialog open={dialogOpen} />
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
