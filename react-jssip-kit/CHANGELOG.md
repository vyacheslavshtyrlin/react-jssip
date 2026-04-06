# Changelog

## 1.0.5
- Added: `SipSessionState.headers` — SIP headers from the initial INVITE are now stored in session state as `Record<string, string>` (lowercase keys). Accessible via `useSipSession(sessionId)?.headers['x-custom-header']` without subscribing to `newRTCSession`.
- Fixed: `unhold` event no longer allows two sessions to be simultaneously Active — other Active sessions are now held automatically, consistent with the behaviour on `newRTCSession`.
- Fixed: `accepted` event now also holds other Active sessions before marking the answered session as Active, closing an edge case where a manual `unhold` between incoming and answering could result in two Active sessions.
- Fixed: race condition in `call()` — `mediaStream` is now stored via `pendingMedia` before `ua.call()` so it is available when `newRTCSession` fires synchronously inside the call; previously audio was set too late and could be missed entirely.
- Fixed: mic track death at or before `confirmed` was not detected for up to 4 s due to the warmup guard — `MicRecoveryManager` now does an immediate `readyState` check and attaches a native `track.ended` listener for zero-latency detection.
- Fixed: `cleanupAllSessions()` cleared the handler map without calling `session.off()` — JsSIP could still fire `ended`/`failed` events on cleaned-up sessions, reaching unmounted React components.
- Fixed: `attachCallStatsLogging` listeners (`confirmed`, `ended`, `failed`) were never removed — cleanup closures are now stored per-session and called from both `cleanupSession` and `cleanupAllSessions`.
- Fixed: a `call()` exception thrown after `newRTCSession` fires synchronously left a phantom `Dialing` session in state — the catch block now finds and removes it.
- Fixed: `hangup()` no longer throws when the JsSIP session is already terminated; the `terminate()` call is now wrapped in try/catch.
- Fixed: attended transfer (`replaces` event) was silently dropped — `e.accept()` is now called automatically in the session handler.
- Fixed: `session.off()` reference mismatch in audio bind retry — anonymous arrow wrappers `() => fn()` produced different references than the registered handlers; extracted to named refs via `audio-bind.retry.ts`.
- Refactor: audio bind retry/exhaustion state machine extracted to `audio-bind.retry.ts`; `session.lifecycle.ts` reduced from ~530 to ~220 lines.
- Refactor: `icecandidate` handler deduplication — `fireReady()` inner function replaces three identical log+flag+call sequences.
- Removed: `tokens.ts` — dead file with no imports.

## 1.0.4
- Added: `useMicDrop` hook — fires when `MicRecoveryManager` detects an audio track or sender drop. Payload: `{ sessionId, trackLive, senderLive }`. When `trackLive=true` the manager self-heals via `replaceAudioTrack`; when `trackLive=false` the application should call `getUserMedia` + `setSessionMedia` + `reinvite`.
- Added: `useSessionIceFailed` hook — fires once per session when `iceConnectionState` reaches `"failed"`. Intended for ICE restart: `reinvite(sessionId, { rtcOfferConstraints: { iceRestart: true } })`. Deduped by flag — emits at most once per session lifetime regardless of how many state-change events the PC fires.
- Added: `MicDropPayload` and `SessionIceFailedPayload` public types.
- Added: `events.onMicDrop` and `events.onSessionIceFailed` on `SipKernel`.
- Fixed: `session.handlers.ts` — all terminal session paths (`ended`, `failed`, `getusermediafailed`, three `peerconnection:*failed`) now share a single `cleanupSession()` helper, eliminating the risk of forgetting to clean up a new resource in a future change.
- Fixed: ICE failed listener is properly removed in every session terminal path and on `peerconnection` re-fire (reinvite), preventing stale DOM event listeners on a dead `RTCPeerConnection`.

## 1.0.3
- Fixed: calling `connect()` during auto-reconnect no longer leaves the old `ReconnectManager` running in the background.
- Fixed: reconnect manager now cancels immediately on WebSocket `connected` event, not only on `registered` — fixes stale reconnect loop when SIP registration is disabled.
- Added: `useCallTimer(sessionId?)` hook — returns elapsed seconds since call was accepted, updates every second.
- Added: `useCallQuality(sessionId?)` hook — polls WebRTC stats every 3 s and returns `CallQuality` (`rtt`, `packetLoss`, `jitter`, `level`).
- Added: `useSipMessages(filter?)` hook — accumulates inbound/outbound SIP MESSAGE events.
- Added: `attendedTransferSession(sessionId, replaceSessionId)` action and kernel command for attended (consultative) transfer via SIP REFER with Replaces.
- Added: `SipStatus.Reconnecting` state — set while exponential-backoff reconnect attempts are in progress.
- Added: `CallStatus.EarlyMedia` state — set when a remote 183 Session Progress with SDP body is received.
- Added: `reconnect` option in `SipConfiguration` (`enabled`, `maxAttempts`, `delayMs`, `backoffMultiplier`) for automatic reconnection with exponential backoff.
- Fixed: audio drop bug (caller could not hear callee) caused by transient ICE states (`disconnected`, `checking`) triggering premature `srcObject` reset in `useSessionMedia` / `CallPlayer`. Now only reacts to final states (`connected`, `completed`, `failed`, `closed`).

## 1.0.2
- Breaking: API surface is now explicitly fixed at package root exports (`src/index.ts`). Internal `core/*` modules are not part of the public contract.
- Breaking: `SipContext` is no longer exported from package root; use `SipProvider` + hooks (`useSipKernel`, etc.).
- Breaking: `createSipKernel()` no longer accepts injected `client`/`eventManager`; kernel composition is internal-only.
- Breaking: video-related API and state were removed (`switchCamera`, `enableVideo`, `disableVideo`, `remoteVideoEnabled`, video track surface).
- Breaking: platform/jssip-lib transitional structure was removed; architecture is consolidated into `core`.
- Added: `docs/MODULES.md` with module-level architecture map and ownership notes.
- Docs: README updated with explicit public API contract and internal boundary.

## 0.8.0
- Breaking: `SipProvider` is now kernel-only and requires `kernel` prop.
- Added `createSipKernel()` and `SipKernel` as the primary composition API.
- Added `useSipKernel()` hook for explicit direct kernel access.
- Hooks migrated internally to kernel interfaces (`store`, `commands`, `events`).
- Added new core module skeleton (`core/contracts`, `core/modules`, `core/kernel`) for modular architecture.
- Restored missing `src/jssip-lib/core/sipErrorHandler.ts` to align source with published typings/build output.

## 0.4.0
- Breaking: public client control methods now require an explicit `sessionId` as the first argument (`answer`, `hangup`, mute/hold toggles, DTMF/transfer helpers).
- Added exports for client-facing types (events, options, RTCSession/UA maps) from the package entrypoint for easier consumption.
- Allow setting media on a session id before the session object is attached to retain pending streams.
- When debug is enabled, expose `window.sipState()` and `window.sipSessions()` helpers for quick inspection (stubbed safely when disabled).

## 0.1.1
- Exported `SipSessionState` from the public entrypoint and aligned demo/imports to the new package name.

## 0.1.0
- Initial public release: React provider/hooks around bundled JsSIP client.
