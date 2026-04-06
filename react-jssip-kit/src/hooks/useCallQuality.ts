import { useEffect, useMemo, useRef, useState } from "react";
import { CallStatus } from "../core/contracts/state";
import { useSipKernel } from "./useSip";
import { useSipSelector } from "./useSipSelector";

export type CallQuality = {
  rtt: number;
  packetLoss: number;
  jitter: number;
  level: "good" | "medium" | "poor";
};

const POLL_INTERVAL_MS = 3000;

function computeLevel(
  rtt: number,
  packetLoss: number,
  jitter: number
): CallQuality["level"] {
  if (rtt > 300 || packetLoss > 0.1 || jitter > 50) return "poor";
  if (rtt < 150 && packetLoss < 0.03 && jitter < 20) return "good";
  return "medium";
}

async function readStats(
  pc: RTCPeerConnection,
  prevReceived: { current: number },
  prevLost: { current: number }
): Promise<CallQuality | null> {
  const report = await pc.getStats();
  let rtt = 0;
  let jitter = 0;
  let packetsReceived = 0;
  let packetsLost = 0;
  let hasInbound = false;

  report.forEach((stat) => {
    const kind = (stat as any).kind ?? (stat as any).mediaType;

    if (stat.type === "inbound-rtp" && kind === "audio") {
      hasInbound = true;
      jitter = ((stat as any).jitter ?? 0) * 1000;
      packetsReceived = (stat as any).packetsReceived ?? 0;
      packetsLost = (stat as any).packetsLost ?? 0;
    }

    if (
      stat.type === "candidate-pair" &&
      (stat as any).state === "succeeded"
    ) {
      const raw = (stat as any).currentRoundTripTime;
      if (typeof raw === "number") rtt = raw * 1000;
    }
  });

  if (!hasInbound) return null;

  const deltaReceived = packetsReceived - prevReceived.current;
  const deltaLost = packetsLost - prevLost.current;
  prevReceived.current = packetsReceived;
  prevLost.current = packetsLost;

  const total = deltaReceived + Math.max(0, deltaLost);
  const packetLoss = total > 0 ? Math.max(0, deltaLost) / total : 0;

  return {
    rtt,
    packetLoss,
    jitter,
    level: computeLevel(rtt, packetLoss, jitter),
  };
}

export function useCallQuality(sessionId?: string): CallQuality | null {
  const { media } = useSipKernel();
  const sessions = useSipSelector((s) => s.sessions);
  const [quality, setQuality] = useState<CallQuality | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const prevReceived = useRef(0);
  const prevLost = useRef(0);

  const resolvedSessionId = useMemo(() => {
    if (sessionId) return sessionId;
    const active = sessions.find((s) => s.status === CallStatus.Active);
    return active?.id ?? sessions[0]?.id;
  }, [sessionId, sessions]);

  useEffect(() => {
    if (!resolvedSessionId) {
      pcRef.current = null;
      setQuality(null);
      return;
    }
    return media.observePeerConnection(resolvedSessionId, (pc) => {
      pcRef.current = pc;
      if (!pc) setQuality(null);
    });
  }, [media, resolvedSessionId]);

  useEffect(() => {
    if (!resolvedSessionId) return;

    prevReceived.current = 0;
    prevLost.current = 0;

    const poll = async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const result = await readStats(pc, prevReceived, prevLost);
        if (result) setQuality(result);
      } catch {
        // ignore stats errors
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [resolvedSessionId]);

  return quality;
}
