# react-jssip-kit Module Map

This document is the working map of the current architecture.
It is written for maintainers and for product integration planning.

## 1) Public API boundary

Stable entrypoint: `src/index.ts`.

Public runtime exports:
- `SipProvider`
- hooks: `useSipKernel`, `useSipState`, `useSipSelector`, `useSipActions`, `useSipEvent`, `useSipSessionEvent`, `useSipSessions`, `useSipSession`, `useActiveSipSession`, `useSessionMedia`
- component: `CallPlayer`
- factory utilities: `createSipKernel`, `createSipClientInstance`, `createSipEventManager`
- enums/constants: `SipStatus`, `CallStatus`, `CallDirection`
- `WebSocketInterface` from `jssip`

Public type exports are aggregated through `src/core/public-types.ts`.

## 2) Top-level layers

- `src/core`: domain + application orchestration.
- `src/hooks`: React bindings for kernel state/actions/events.
- `src/provider`: React provider for dependency injection of kernel.
- `src/context`: React context contract.
- `src/components`: optional UI helper components.

## 3) Core modules and responsibilities

### `core/client`
- File: `src/core/client/sip.client.ts`
- Role: runtime facade around all SIP operations.
- Owns: UA start/stop flow, session orchestration, state store updates.
- Depends on: `ua.module`, `session.module`, `mic-recovery.manager`, debug/runtime modules.

### `core/kernel`
- Files: `src/core/kernel/createSipKernel.ts`, `src/core/kernel/types.ts`
- Role: composition root for app code.
- Creates internal `SipClient`, event manager, media module.
- Exposes unified API:
  - `store` (subscribe/getState)
  - `commands`
  - `events`
  - `eventManager`
  - `media`

### `core/contracts`
- Files:
  - `contracts/state.ts`
  - `contracts/gateways.ts`
  - `contracts/events.ts`
  - `contracts/tokens.ts` (internal DI token constants)
- Role: domain-level contracts, enums, value shapes.
- Current call model is audio-only.

### `core/sip`
- Files:
  - `sip/types.ts`
  - `sip/user-agent.ts`
- Role:
  - JsSIP type boundary and event/type mapping.
  - thin UA wrapper (`SipUserAgent`) with debug flag handling.

### `core/modules/session`
- Files:
  - `session.module.ts`
  - `session.manager.ts`
  - `session.lifecycle.ts`
  - `session.handlers.ts`
  - `session.state.projector.ts`
- Role:
  - call/session behavior (create, answer, hangup, mute, hold, DTMF, transfer)
  - event-driven session lifecycle
  - projection into normalized state (`sessions`, `sessionsById`, `sessionIds`)

### `core/modules/ua`
- Files:
  - `ua.module.ts`
  - `ua.handlers.ts`
- Role:
  - UA transport registration lifecycle
  - mapping UA events to state and app event bus

### `core/modules/media`
- Files:
  - `media.module.ts`
  - `mic-recovery.manager.ts`
  - `webrtc-session.controller.ts`
  - `types.ts`
- Role:
  - media/session observation (`useSessionMedia` contract support)
  - audio track recovery flow
  - RTC session control primitives used by session manager

### `core/modules/state`
- Files:
  - `sip.state.ts`
  - `sip.state.store.ts`
  - `sip.selectors.ts`
  - `state.store.ts` (generic utility)
- Role:
  - state initialization and persistence in-memory
  - subscription + batched updates
  - selectors

### `core/modules/event`
- Files:
  - `event-target.emitter.ts`
  - `event.bus.ts`
  - `sip-event-manager.adapter.ts`
- Role:
  - event transport inside runtime
  - mapping client/session events to consumer-facing subscriptions

### `core/modules/debug`
- Files:
  - `sip-debugger.ts`
  - `sip-debug.runtime.ts`
  - `sip-debug.logger.ts`
- Role:
  - debug toggles and browser bridge (`window.sipSupport`)
  - state/session debug snapshots
  - media/session diagnostics

### `core/modules/runtime`
- File: `browser-unload.runtime.ts`
- Role:
  - browser lifecycle glue (`beforeunload` handling)

### `core/errors`
- File: `sip-error-handler.ts`
- Role:
  - consistent error formatting and message mapping

## 4) React bindings

### Context and Provider
- `src/context/index.tsx`: `SipContext` type and instance.
- `src/provider/index.tsx`: injects a ready `kernel` into tree.

### Hooks
- `useSip.ts`: access kernel (`useSipKernel`).
- `useSipState.ts`: external-store subscription.
- `useSipSelector.ts`: selector-based reads with equality function.
- `useSipActions.ts`: command facade.
- `useSipEvent.ts`: UA/session event subscriptions.
- `useSipSessions.ts`, `useSipSession.ts`, `useActiveSipSession.ts`: session selectors.
- `useSessionMedia.ts`: derived session media state for UI.

### Component
- `src/components/call-player.tsx`: minimal audio element bound to `useSessionMedia`.

## 5) Internal vs stable API rule

Treat as stable:
- `src/index.ts` exports
- `src/core/public-types.ts` types

Treat as internal (may change without semver guarantees unless explicitly exported from root):
- all `core/modules/*` internals
- direct classes from `core/client` except root-level factory API

## 6) Change checklist (maintainer quick flow)

When changing call behavior:
1. Update session logic in `core/modules/session/*`.
2. Update projection shape in `session.state.projector.ts` + `contracts/state.ts`.
3. Validate kernel command surface in `kernel/createSipKernel.ts` and `kernel/types.ts`.
4. Validate hooks that depend on affected state/actions.
5. Update README + CHANGELOG for any public behavior or contract change.
