import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { RingCardContent } from "./ui/ring-card-contnet";
import { RingCardFooter } from "./ui/ring-card-footer";
import { Dialpad } from "../dialer/ui/dialpad";
import { DTMF_TRANSPORT } from "jssip/lib/Constants";
import { useSipActions, useSipSessions, useSipState } from "react-jssip-kit";

export default function RingDialog({ open }: { open: boolean }) {
  const [dtmfMode, setDtmfMode] = useState(false);
  const { sendDTMF } = useSipActions();
  const { sessions } = useSipSessions();
  const activeSessionId =
    sessions.find((s) => s.status === "active")?.id ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  console.log(sessions);

  useEffect(() => {
    if (selectedSessionId) return;
    if (activeSessionId) setSelectedSessionId(activeSessionId);
    else if (sessions[0]) setSelectedSessionId(sessions[0].id);
  }, [activeSessionId, sessions, selectedSessionId]);

  return (
    <Dialog open={open}>
      <DialogContent className="w-fit">
        {dtmfMode ? (
          <Dialpad
            onNumberClick={(num) =>
              sendDTMF(
                num,
                { transportType: DTMF_TRANSPORT.RFC2833 },
                selectedSessionId || undefined
              )
            }
          />
        ) : (
          <RingCardContent
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />
        )}
        <RingCardFooter
          dtmfMode={dtmfMode}
          setDtmfMode={setDtmfMode}
          sessionId={selectedSessionId || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
