"use client";

import { useState } from "react";
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Keyboard,
  PhoneOff,
  Phone,
} from "lucide-react";
import {
  CallStatus,
  useCallTimer,
  useCallQuality,
  type CallQuality,
  type SipSessionState,
} from "react-jssip-kit";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Dialpad } from "./dialpad";

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const STATUS_LABEL: Record<string, string> = {
  [CallStatus.Ringing]: "Звонок...",
  [CallStatus.Dialing]: "Набор...",
  [CallStatus.EarlyMedia]: "Дозвон...",
  [CallStatus.Active]: "Активен",
  [CallStatus.Hold]: "Удержание",
  [CallStatus.Idle]: "",
};

// ─── signal bars ──────────────────────────────────────────────────────────────

function SignalBars({ quality }: { quality: CallQuality | null }) {
  if (!quality) return null;
  const bars =
    quality.level === "good" ? 3 : quality.level === "medium" ? 2 : 1;
  return (
    <div
      className="flex items-end gap-[3px] h-3.5"
      title={`RTT ${Math.round(quality.rtt)}ms`}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-[1px]",
            i === 1 ? "h-[5px]" : i === 2 ? "h-[9px]" : "h-[14px]",
            i <= bars
              ? quality.level === "good"
                ? "bg-green-400"
                : quality.level === "medium"
                  ? "bg-yellow-400"
                  : "bg-red-400"
              : "bg-secondary-background",
          )}
        />
      ))}
    </div>
  );
}

// ─── action icon button ───────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  active = false,
  activeClass = "bg-main",
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeClass?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        variant={active ? "default" : "neutral"}
        size="icon"
        disabled={disabled}
        onClick={onClick}
        className={cn("size-12 rounded-base", active && activeClass)}
      >
        {icon}
      </Button>
      <span className="text-[11px] font-base text-foreground/60 leading-none">
        {label}
      </span>
    </div>
  );
}

// ─── DTMF dialog ──────────────────────────────────────────────────────────────

function DtmfDialog({
  open,
  sessionId,
  onSendDTMF,
  onClose,
}: {
  open: boolean;
  sessionId: string;
  onSendDTMF: (id: string, tone: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogTitle className="text-center text-sm font-heading">
          Набор DTMF
        </DialogTitle>
        <Dialpad onNumberClick={(tone) => onSendDTMF(sessionId, tone)} />
      </DialogContent>
    </Dialog>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export type ActiveCallCardProps = {
  session: SipSessionState;
  onAnswer: (id: string) => void;
  onHangup: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleHold: (id: string) => void;
  onSendDTMF: (id: string, tone: string) => void;
};

export function ActiveCallCard({
  session,
  onAnswer,
  onHangup,
  onToggleMute,
  onToggleHold,
  onSendDTMF,
}: ActiveCallCardProps) {
  const [showDtmf, setShowDtmf] = useState(false);

  const timer = useCallTimer(session.id);
  const quality = useCallQuality(session.id);

  const { status, direction, from, to, muted } = session;
  const isIncoming = direction === "remote";
  const isRinging = status === CallStatus.Ringing;
  const isHold = status === CallStatus.Hold;
  const isActive = status === CallStatus.Active;
  const isPreCall =
    status === CallStatus.Dialing || status === CallStatus.EarlyMedia;
  const isCallable = isActive || isPreCall || isHold;

  const name = isIncoming ? from : to;
  const initial = name?.trim()[0]?.toUpperCase() ?? "?";

  const timerText = isActive && timer != null ? formatTime(timer) : null;
  const statusLabel = STATUS_LABEL[status] ?? "";

  return (
    <div className="flex flex-col items-center h-full">
      {/* ── avatar + identity ──────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 py-6 w-full  rounded-t-base">
        <div className="relative">
          {isRinging && isIncoming && (
            <span className="absolute -inset-2 rounded-full  bg-green-200 animate-ping" />
          )}
          <Avatar className="size-16 ">
            <AvatarFallback className="text-2xl font-heading bg-main text-main-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center px-4">
          <span className="text-xl font-heading tracking-tight text-foreground leading-none">
            {name || "Неизвестный"}
          </span>

          <div className="flex items-center gap-2">
            {timerText ? (
              <span className="text-sm font-mono tabular-nums text-foreground/70">
                {timerText}
              </span>
            ) : (
              <Badge
                variant={isHold ? "default" : "neutral"}
                className={cn((isRinging || isPreCall) && "animate-pulse")}
              >
                {statusLabel}
              </Badge>
            )}
            {isActive && <SignalBars quality={quality} />}
          </div>
        </div>
      </div>

      {/* ── actions ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 w-full p-4 flex-1">
        {isRinging && isIncoming ? (
          /* incoming: reject + accept */
          <div className="flex items-center justify-center gap-8 mt-auto">
            <div className="flex flex-col items-center gap-1.5">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onHangup(session.id)}
                className="size-14 rounded-full [&_svg]:size-6"
              >
                <PhoneOff />
              </Button>
              <span className="text-[11px] font-base text-foreground/60">
                Отклонить
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Button
                size="icon"
                onClick={() => onAnswer(session.id)}
                className="size-14 rounded-full bg-green-400 hover:bg-green-300 text-foreground [&_svg]:size-6"
              >
                <Phone />
              </Button>
              <span className="text-[11px] font-base text-foreground/60">
                Принять
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* secondary controls */}
            <div className="flex justify-center gap-6 pt-2">
              <ActionBtn
                icon={muted ? <MicOff /> : <Mic />}
                label={muted ? "Включить" : "Выключить"}
                active={muted}
                activeClass="bg-red-400"
                disabled={!isCallable}
                onClick={() => onToggleMute(session.id)}
              />

              <ActionBtn
                icon={isHold ? <Play /> : <Pause />}
                label={isHold ? "Снять" : "Удержать"}
                active={isHold}
                activeClass="bg-yellow-400"
                disabled={!isCallable}
                onClick={() => onToggleHold(session.id)}
              />

              <ActionBtn
                icon={<Keyboard />}
                label="Клавиши"
                disabled={!isCallable}
                onClick={() => setShowDtmf(true)}
              />
            </div>

            {/* end call */}
            <Button
              variant="destructive"
              onClick={() => onHangup(session.id)}
              className="w-full mt-auto"
            >
              <PhoneOff data-icon="inline-start" />
              Завершить
            </Button>
          </>
        )}
      </div>

      <DtmfDialog
        open={showDtmf}
        sessionId={session.id}
        onSendDTMF={onSendDTMF}
        onClose={() => setShowDtmf(false)}
      />
    </div>
  );
}
