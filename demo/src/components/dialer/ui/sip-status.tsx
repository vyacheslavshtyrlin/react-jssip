import { Badge } from "@/components/ui/badge";
import type { SipStatus } from 'react-jssip-kit';
import { cva } from "class-variance-authority";

const sipStatusVariants = cva("", {
  variants: {
    status: {
      disconnected: "bg-gray-400",
      connecting: "bg-yellow-400 animate-pulse",
      connected: "bg-blue-400",
      registered: "bg-green-400",
      unregistered: "bg-gray-400",
      registrationFailed: "bg-red-400",
    },
  },
  defaultVariants: {
    status: "disconnected",
  },
});

const SipStatusRu: Record<SipStatus, string> = {
  disconnected: "Отключено",
  connecting: "Подключение...",
  connected: "Подключен",
  registered: "Зарегистрирован",
  unregistered: "Не зарегистрировано",
  registrationFailed: "Ошибка регистрации",
};

export function SipStatusBadge({ status }: { status: SipStatus }) {
  return (
    <Badge className={sipStatusVariants({ status })}>
      {SipStatusRu[status]}
    </Badge>
  );
}
