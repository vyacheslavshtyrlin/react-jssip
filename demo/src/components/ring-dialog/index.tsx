import { Dialog, DialogContent, DialogFooter } from "../ui/dialog";
import { RingCardContent } from "./ui/ring-card-contnet";
import { RingCardFooter } from "./ui/ring-card-footer";
import { useSipSessions } from "react-jssip-kit";

export default function RingDialog({ open }: { open: boolean }) {
  const { sessions } = useSipSessions();

  const activeSessions = sessions.length > 0 ? sessions : [];
  const hasSessions = activeSessions.length > 0;

  return (
    <Dialog open={Boolean(activeSessions.length)}>
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
