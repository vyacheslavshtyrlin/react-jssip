import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialpad } from "../../dialer/ui/dialpad";
import type { SipSessionState } from "react-jssip-kit";
import { CallStatus, useSipActions } from "react-jssip-kit";
import { Mic, MicOff, PhoneCall, PhoneOff, Smartphone } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DTMF_TRANSPORT } from "jssip/src/Constants";

export const RingCardFooter = ({ session }: { session: SipSessionState }) => {
  const [dtmfOpen, setDtmfOpen] = useState(false);
  const callDirection = session.direction ?? "none";
  const muted = session.muted ?? false;
  const callStatus = session.status ?? CallStatus.Idle;

  const { answer, hangup, toggleMute, sendDTMF } = useSipActions();

  const isActive = callStatus === CallStatus.Active;

  return (
    <div className="relative">
      <div className="w-full my-2 flex flex-row gap-4 justify-around sm:justify-around">
        <Button
          onClick={() => answer(session.id)}
          disabled={callDirection !== "local"}
          size="lg"
          className="bg-green-500 animate-pulse rounded-full"
        >
          <PhoneCall />
        </Button>

        <Button
          onClick={() => setDtmfOpen((prev) => !prev)}
          size="lg"
          variant="neutral"
          className="rounded-full"
        >
          <Smartphone />
        </Button>

        <Button
          onClick={() => toggleMute(session.id)}
          disabled={!isActive}
          className="rounded-full"
          size="lg"
        >
          {muted ? <Mic /> : <MicOff />}
        </Button>

        <Button
          onClick={() => hangup(session.id)}
          size="lg"
          className="bg-red-500 rounded-full"
        >
          <PhoneOff />
        </Button>
      </div>
      <Dialog open={dtmfOpen} onOpenChange={setDtmfOpen}>
        <DialogContent className="w-80">
          <div className="rounded-xl border bg-background p-3 shadow-xl">
            <Dialpad
              onNumberClick={(num) =>
                sendDTMF(session.id, num, {
                  transportType: DTMF_TRANSPORT.RFC2833,
                })
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
