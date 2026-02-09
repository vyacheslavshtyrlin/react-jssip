# Changelog

## 1.0.0
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
