import type { CallStatus } from "react-jssip-kit";
import { cva } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";

export const callStatusVariants = cva(
  "px-2 py-1 rounded-lg text-xs font-semibold",
  {
    variants: {
      status: {
        idle: "bg-gray-500 text-white",
        ringing: "bg-blue-500 animate-pulse text-white",
        active: "bg-green-500 text-white",
        dialing: "bg-yellow-500 animate-pulse text-white",
        hold: "bg-orange-500 text-white",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  }
);

const CallStatusRu: Record<CallStatus, string> = {
  idle: "...",
  dialing: "Набор",
  ringing: "Дозвон",
  active: "Активен",
  hold: "На удержании",
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return (
    <Badge className={callStatusVariants({ status })}>
      {CallStatusRu[status]}
    </Badge>
  );
}
