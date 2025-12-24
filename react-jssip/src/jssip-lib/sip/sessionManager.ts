import { WebRTCSessionController } from "./sessionController";
import type { RTCSession } from "./types";

type SessionEntry = {
  rtc: WebRTCSessionController;
  session?: RTCSession | null;
  media?: MediaStream | null;
};

export class SessionManager {
  private entries = new Map<string, SessionEntry>();
  private pendingMediaQueue: Array<{ stream: MediaStream; addedAt: number }> = [];
  private pendingMediaTtlMs = 30000;

  setPendingMediaTtl(ms: number | undefined) {
    if (typeof ms === "number" && ms > 0) this.pendingMediaTtlMs = ms;
  }

  enqueueOutgoingMedia(stream: MediaStream) {
    this.pendingMediaQueue.push({ stream, addedAt: Date.now() });
  }

  dequeueOutgoingMedia(): MediaStream | null {
    const now = Date.now();
    while (this.pendingMediaQueue.length) {
      const next = this.pendingMediaQueue.shift();
      if (!next) break;
      if (now - next.addedAt <= this.pendingMediaTtlMs) {
        return next.stream;
      } else {
        // drop stale stream
        next.stream.getTracks().forEach((t) => t.stop());
      }
    }
    return null;
  }

  getOrCreateRtc(sessionId: string, session?: RTCSession) {
    let entry = this.entries.get(sessionId);
    if (!entry) {
      entry = { rtc: new WebRTCSessionController(), session: null, media: null };
      this.entries.set(sessionId, entry);
    }
    if (session) {
      entry.session = session;
      entry.rtc.setSession(session);
    }
    if (entry.media) entry.rtc.setMediaStream(entry.media);
    return entry.rtc;
  }

  getRtc(sessionId: string) {
    return this.entries.get(sessionId)?.rtc ?? null;
  }

  setSession(sessionId: string, session: RTCSession) {
    const entry = this.entries.get(sessionId);
    if (entry) {
      entry.session = session;
      entry.rtc.setSession(session);
    } else {
      this.entries.set(sessionId, {
        rtc: new WebRTCSessionController(),
        session,
        media: null,
      });
    }
  }

  setSessionMedia(sessionId: string, stream: MediaStream) {
    const entry = this.entries.get(sessionId) ?? {
      rtc: new WebRTCSessionController(),
      session: null,
      media: null,
    };
    entry.media = stream;
    entry.rtc.setMediaStream(stream);
    this.entries.set(sessionId, entry);
  }

  getSession(sessionId: string) {
    return this.entries.get(sessionId)?.session ?? null;
  }

  getSessionIds() {
    return Array.from(this.entries.keys());
  }

  getSessions() {
    return Array.from(this.entries.entries()).map(([id, entry]) => ({
      id,
      session: entry.session as RTCSession,
    }));
  }

  getActiveSessionId(activeStatuses: string[] = ["active"]): string | null {
    for (const [id, entry] of Array.from(this.entries.entries()).reverse()) {
      const status = (entry.session as any)?.status;
      if (status && activeStatuses.includes(String(status).toLowerCase())) {
        return id;
      }
    }
    return null;
  }

  cleanupSession(sessionId: string) {
    const entry = this.entries.get(sessionId);
    if (entry) {
      entry.rtc.cleanup();
      this.entries.delete(sessionId);
    }
  }

  cleanupAllSessions() {
    for (const [, entry] of this.entries.entries()) {
      entry.rtc.cleanup();
    }
    this.entries.clear();
    this.pendingMediaQueue = [];
  }

  answer(sessionId: string, options: any) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.answer(options) : false;
  }

  hangup(sessionId: string, options?: any) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.hangup(options) : false;
  }

  mute(sessionId: string) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.mute() : false;
  }

  unmute(sessionId: string) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.unmute() : false;
  }

  hold(sessionId: string) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.hold() : false;
  }

  unhold(sessionId: string) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.unhold() : false;
  }

  sendDTMF(sessionId: string, tones: string | number, options?: any) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.sendDTMF(tones, options) : false;
  }

  transfer(sessionId: string, target: string | RTCSession, options?: any) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.transfer(target, options) : false;
  }

  attendedTransfer(sessionId: string, otherSession: RTCSession) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.attendedTransfer(otherSession) : false;
  }

  startScreenShare(sessionId: string, getDisplayMedia: () => Promise<MediaStream>) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.startScreenShare(getDisplayMedia) : false;
  }
}
