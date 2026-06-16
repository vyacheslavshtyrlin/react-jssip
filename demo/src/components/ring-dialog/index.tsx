import { Dialog, DialogContent, DialogFooter } from "../ui/dialog";
import { RingCardContent } from "./ui/ring-card-contnet";
import { RingCardFooter } from "./ui/ring-card-footer";
import { CallStatus, useSipSessions } from "react-jssip-kit";

export default function RingDialog() {
  const { sessions } = useSipSessions();

  const ringingSessions = sessions.filter(
    (session) =>
      session.direction === "remote" && session.status === CallStatus.Ringing,
  );
  const hasSessions = ringingSessions.length > 0;

  return (
    <Dialog open={hasSessions}>
      <DialogContent className="w-full max-w-2xl space-y-4 bg-background">
        {!hasSessions ? (
          <RingCardContent session={null} />
        ) : (
          ringingSessions.map((session) => {
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
