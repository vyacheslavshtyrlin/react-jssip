import type { SipSessionState } from "react-jssip-kit";
import { PhoneIncoming, PhoneOutgoing, UserRound } from "lucide-react";
import { CallStatusBadge } from "../../dialer/ui/call-status";

type Props = {
  session: SipSessionState | null;
};

export const RingCardContent = ({ session }: Props) => {
  if (!session) {
    return (
      <div className="flex flex-col w-full gap-4 my-auto items-center">
        <UserRound className="h-48 w-48" />
        <div className="flex flex-col gap-2 items-center mt-auto">
          <span className="text-lg text-muted-foreground">No active calls</span>
        </div>
      </div>
    );
  }

  const directionIcon =
    session.direction === "remote" ? (
      <PhoneIncoming className="h-5 w-5 text-emerald-500" />
    ) : (
      <PhoneOutgoing className="h-5 w-5 text-sky-500" />
    );

  const name = session.direction === "remote" ? session.from : session.to;

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3 gap-3">
      <div className="flex items-center gap-3">
        <UserRound className="h-10 w-10" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {directionIcon}
            <span className="font-medium">{name || "Unknown"}</span>
          </div>
          <CallStatusBadge status={session.status} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">#{session.id}</div>
    </div>
  );
};
