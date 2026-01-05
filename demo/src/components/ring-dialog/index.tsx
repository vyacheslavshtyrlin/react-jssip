import { Dialog, DialogContent, DialogFooter } from "../ui/dialog";
import { RingCardContent } from "./ui/ring-card-contnet";
import { RingCardFooter } from "./ui/ring-card-footer";
import { CallStatus, useSipSessions } from "react-jssip-kit";
import type { SipSessionState } from "react-jssip-kit";

export default function RingDialog({ open }: { open: boolean }) {
  const { sessions } = useSipSessions();

  const mockSessions: SipSessionState[] = [
    {
      id: "mock-1",
      status: "dialing",
      direction: "incoming",
      from: "Alice",
      to: "You",
      muted: false,
      acceptedAt: null,
      mediaKind: "audio",
      remoteVideoEnabled: false,
    },
    {
      id: "mock-2",
      status: CallStatus.Active,
      direction: "outgoing",
      from: "You",
      to: "Bob",
      muted: true,
      acceptedAt: Date.now() - 60_000,
      mediaKind: "audio",
      remoteVideoEnabled: false,
    },

    {
      id: "mock-3",
      status: "ringing",
      direction: "outgoing",
      from: "You",
      to: "WOW",
      muted: true,
      acceptedAt: Date.now() - 60_000,
      mediaKind: "audio",
      remoteVideoEnabled: false,
    },
  ];

  const activeSessions = sessions.length > 0 ? sessions : mockSessions;
  const hasSessions = activeSessions.length > 0;

  return (
    <Dialog open={true}>
      <DialogContent className="w-full max-w-2xl space-y-4 bg-background">
        {!hasSessions ? (
          <RingCardContent session={null} />
        ) : (
          activeSessions.map((session) => {
            return (
              <div
                key={session.id}
                className="relative flex flex-col bg-white gap-3 rounded-xl border p-4"
              >
                <RingCardContent session={session} />
                <DialogFooter className="w-full my-2 flex flex-row justify-around sm:justify-around">
                  <RingCardFooter session={session} />
                </DialogFooter>
              </div>
            );
          })
        )}
      </DialogContent>
    </Dialog>
  );
}
