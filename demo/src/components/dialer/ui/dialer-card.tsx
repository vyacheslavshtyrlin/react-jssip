import { useEffect, useRef, useState } from "react";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialpad } from "./dialpad";
import {
  CallStatus,
  SipStatus,
  useSipSessions,
  useSipState,
} from "react-jssip-kit";
import { useCallAction } from "@/hook/useCallAction";
import { ActiveCallCard } from "./active-call-card";

export const DialerCard = () => {
  const [number, setNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    startCall,
    answerCall,
    hangupCall,
    toggleMuteCall,
    toggleHoldCall,
    sendDTMF,
  } = useCallAction();
  const { sipStatus } = useSipState();
  const { sessions } = useSipSessions();

  const currentSession =
    sessions.find((session) => session.status === CallStatus.Active) ??
    sessions.find((session) => session.status === CallStatus.Ringing) ??
    sessions.find((session) => session.status === CallStatus.EarlyMedia) ??
    sessions.find((session) => session.status === CallStatus.Dialing) ??
    sessions.find((session) => session.status === CallStatus.Hold) ??
    null;

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, [sipStatus]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, []);

  if (currentSession) {
    return (
      <ActiveCallCard
        session={currentSession}
        onAnswer={answerCall}
        onHangup={hangupCall}
        onToggleMute={toggleMuteCall}
        onToggleHold={toggleHoldCall}
        onSendDTMF={sendDTMF}
      />
    );
  }

  return (
    <div className="space-y-4  flex  flex-col gap-1">
      <div className="relative">
        <Input
          disabled={sipStatus !== SipStatus.Registered}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          ref={inputRef}
          placeholder="Введите номер"
          className="text-center text-lg "
          autoFocus
        />
      </div>

      <Dialpad onNumberClick={(number) => setNumber((prev) => prev + number)} />

      <Button
        disabled={sipStatus !== SipStatus.Registered}
        onClick={() => startCall(number)}
        className="w-full h-10 mt-2 text-lg bg-green-500"
      >
        <PhoneCall className="h-5 w-5" />
      </Button>
    </div>
  );
};
