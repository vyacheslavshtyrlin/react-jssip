import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { CallStatus, useSipActions, useSipState } from "react-jssip";
import { Mic, MicOff, PhoneCall, PhoneOff, Smartphone } from "lucide-react";

export const RingCardFooter = ({
  dtmfMode,
  setDtmfMode,
  sessionId,
}: {
  dtmfMode: boolean;
  setDtmfMode: (value: boolean) => void;
  sessionId?: string;
}) => {
  const { sessions } = useSipState();
  const current =
    sessions.find((s) => s.id === sessionId) ||
    sessions.find((s) => s.status === CallStatus.Active) ||
    sessions[0];
  const callDirection = current?.direction ?? "none";
  const muted = current?.muted ?? false;
  const callStatus = current?.status ?? CallStatus.Idle;

  const { answer, hangup, mute, unmute } = useSipActions();

  const toggleMute = () =>
    muted ? unmute(sessionId) : mute(sessionId);

  const isActive = callStatus === CallStatus.Active;

  return (
    <DialogFooter className="w-full my-2 flex flex-row justify-around sm:justify-around">
      <Button
        onClick={() => answer(sessionId)}
        disabled={callDirection !== "incoming"}
        size="lg"
        className="bg-green-500 animate-pulse rounded-full"
      >
        <PhoneCall />
      </Button>

      <Button
        onClick={() => setDtmfMode(!dtmfMode)}
        // disabled={!isActive}
        className="rounded-full"
        size="lg"
        variant="neutral"
      >
        <Smartphone />
      </Button>

      <Button
        onClick={toggleMute}
        disabled={!isActive}
        className="rounded-full"
        size="lg"
      >
        {muted ? <Mic /> : <MicOff />}
      </Button>

      <Button
        onClick={() => hangup(sessionId)}
        size="lg"
        className="bg-red-500 rounded-full"
      >
        <PhoneOff />
      </Button>
    </DialogFooter>
  );
};
