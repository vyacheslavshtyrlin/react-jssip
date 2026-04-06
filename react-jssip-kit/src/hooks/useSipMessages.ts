import { useEffect, useMemo, useState } from "react";
import { useSipKernel } from "./useSip";

export type SipMessage = {
  from: string;
  to: string;
  body: string;
  at: number;
  direction: "in" | "out";
};

export function useSipMessages(filter?: { from?: string }): SipMessage[] {
  const { events } = useSipKernel();
  const [messages, setMessages] = useState<SipMessage[]>([]);

  useEffect(() => {
    return events.onUA("newMessage", (e) => {
      if (!e) return;
      const direction: "in" | "out" =
        (e as any).originator === "remote" ? "in" : "out";
      const request = (e as any).request;
      const message = (e as any).message;
      const from =
        request?.from?.uri?.user ?? message?.from?.uri?.user ?? "";
      const to =
        request?.to?.uri?.user ?? message?.to?.uri?.user ?? "";
      const body = request?.body ?? message?.body ?? "";

      setMessages((prev) => [
        ...prev,
        { from, to, body, at: Date.now(), direction },
      ]);
    });
  }, [events]);

  const filterFrom = filter?.from;
  return useMemo(() => {
    if (!filterFrom) return messages;
    return messages.filter((m) => m.from === filterFrom);
  }, [messages, filterFrom]);
}
