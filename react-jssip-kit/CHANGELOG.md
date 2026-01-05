# Changelog

## 0.4.0
- Breaking: public client control methods now require an explicit `sessionId` as the first argument (`answer`, `hangup`, mute/hold toggles, DTMF/transfer helpers).
- Added exports for client-facing types (events, options, RTCSession/UA maps) from the package entrypoint for easier consumption.
- Allow setting media on a session id before the session object is attached to retain pending streams.
- When debug is enabled, expose `window.sipState()` and `window.sipSessions()` helpers for quick inspection (stubbed safely when disabled).

## 0.1.1
- Exported `SipSessionState` from the public entrypoint and aligned demo/imports to the new package name.

## 0.1.0
- Initial public release: React provider/hooks around bundled JsSIP client.
