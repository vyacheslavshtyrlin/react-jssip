import { WebRTCSessionController } from "./sessionController";
import type { RTCSession } from "./types";

type SessionEntry = {
  rtc: WebRTCSessionController;
  session?: RTCSession | null;
  media?: MediaStream | null;
};

export class SessionManager {
  private entries = new Map<string, SessionEntry>();

  private stopMediaStream(stream?: MediaStream | null) {
    if (!stream) return;
    for (const t of stream.getTracks()) {
      if (t.readyState !== "ended") t.stop();
    }
  }

  getOrCreateRtc(sessionId: string, session?: RTCSession) {
    let entry = this.entries.get(sessionId);
    if (!entry) {
      entry = {
        rtc: new WebRTCSessionController(),
        session: null,
        media: null,
      };
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
    if (entry.media && entry.media !== stream) {
      this.stopMediaStream(entry.media);
    }
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
      this.stopMediaStream(entry.media);
      this.entries.delete(sessionId);
    }
  }

  cleanupAllSessions() {
    for (const [, entry] of this.entries.entries()) {
      entry.rtc.cleanup();
      this.stopMediaStream(entry.media);
    }
    this.entries.clear();
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

  transfer(sessionId: string, target: string, options?: any) {
    const rtc = this.getRtc(sessionId);
    return rtc ? rtc.transfer(target, options) : false;
  }
}
