import { useSipSessions } from "react-jssip-kit";
import { PhoneIncoming, PhoneOutgoing, UserRound } from "lucide-react";
import { CallStatusBadge } from "../../dialer/ui/call-status";

type Props = {
  selectedSessionId?: string | null;
  onSelect?: (sessionId: string) => void;
};

export const RingCardContent = ({ selectedSessionId, onSelect }: Props) => {
  const { sessions } = useSipSessions();

  const activeSessionId =
    sessions.find((s) => s.status === "active")?.id ?? null;

  if (!sessions.length) {
    return (
      <div className="flex flex-col w-full gap-4 my-auto  items-center">
        <UserRound className="h-48 w-48" />
        <div className="flex flex-col gap-2 items-center mt-auto">
          <span className="text-lg text-muted-foreground">No active calls</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-4 my-auto">
      {sessions.map((s) => {
        const directionIcon =
          s.direction === "incoming" ? (
            <PhoneIncoming className="h-5 w-5 text-emerald-500" />
          ) : (
            <PhoneOutgoing className="h-5 w-5 text-sky-500" />
          );

        const name = s.direction === "incoming" ? s.from : s.to;

        const isActive = s.id === activeSessionId;

        const isSelected = s.id === (selectedSessionId ?? activeSessionId);

        return (
          <div
            key={s.id}
            role="button"
            onClick={() => onSelect?.(s.id)}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 gap-3 transition ${
              isSelected
                ? "border-primary/80 ring-1 ring-primary/40 bg-primary/5"
                : isActive
                  ? "border-primary/40"
                  : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <UserRound className="h-10 w-10" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {directionIcon}
                  <span className="font-medium">{name || "Unknown"}</span>
                </div>
                <CallStatusBadge status={s.status} />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">#{s.id}</div>
          </div>
        );
      })}
    </div>
  );
};
