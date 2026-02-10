# react-jssip-kit: Modules and Lifecycle

This document describes the current architecture of `react-jssip-kit` in detail.
It is intended for maintainers and integrators who need to understand:

1. what each module is responsible for,
2. how modules interact,
3. what lifecycle transitions happen at runtime.

## 1) Public API Boundary

Stable entrypoint: `src/index.ts`.

Public runtime exports:

1. `SipProvider`
2. hooks: `useSipKernel`, `useSipState`, `useSipSelector`, `useSipActions`, `useSipEvent`, `useSipSessionEvent`, `useSipSessions`, `useSipSession`, `useActiveSipSession`, `useSessionMedia`
3. component: `CallPlayer`
4. factories: `createSipKernel`, `createSipClientInstance`, `createSipEventManager`
5. enums/constants: `SipStatus`, `CallStatus`, `CallDirection`
6. `WebSocketInterface` from `jssip`

Public type exports are aggregated via `src/core/public-types.ts`.

Important boundary rule:

1. `SipState` is public and consumer-facing (`sipStatus`, `error`, `sessions`).
2. `sessionsById` and `sessionIds` are internal (`InternalSipState`) and must not be used by consumers.

## 2) Layer Map

Top-level layers:

1. `src/core`: SIP domain/application runtime.
2. `src/hooks`: React bindings for state, commands, events.
3. `src/provider`: React DI for kernel.
4. `src/context`: React context contract.
5. `src/components`: optional UI helpers (`CallPlayer`).

## 3) Core Modules

### 3.1 `core/client`

File: `src/core/client/sip.client.ts`

Role:

1. main runtime facade over all SIP operations,
2. orchestrates UA module, session module, media recovery, debug runtime,
3. exposes high-level methods consumed by kernel commands.

Responsibilities:

1. connect/register/disconnect control,
2. call/session operations (`call`, `answer`, `hangup`, `transfer`, `sendDTMF`, `sendInfo`, `update`, `reinvite`),
3. UA-level operations (`sendMessage`, `sendOptions`),
4. public state bridge (`state`, `onChange`) through `SipStateStore`.

### 3.2 `core/kernel`

Files:

1. `src/core/kernel/createSipKernel.ts`
2. `src/core/kernel/types.ts`

Role:

1. composition root for applications,
2. assembles `SipClient`, event manager, media module,
3. exposes a unified `SipKernel` contract.

Kernel surface:

1. `store`: `getState`, `subscribe`
2. `commands`: all call/UA actions
3. `events`: UA and session subscriptions
4. `eventManager`: low-level event adapter
5. `media`: media observation API for hooks/components

### 3.3 `core/contracts`

Files:

1. `contracts/state.ts`
2. `contracts/gateways.ts`
3. `contracts/events.ts`
4. `contracts/tokens.ts`

Role:

1. shared domain contracts and enums,
2. public vs internal state typing:
   `SipState` (public) and `InternalSipState` (internal normalized shape).

### 3.4 `core/sip`

Files:

1. `sip/types.ts`
2. `sip/user-agent.ts`

Role:

1. JsSIP type boundary and aliases,
2. thin `SipUserAgent` wrapper for start/stop/register and debug flag plumbing.

Design note:

1. this layer isolates direct SDK-specific concerns from higher-level orchestration modules.

### 3.5 `core/modules/session`

Files:

1. `session.module.ts`
2. `session.manager.ts`
3. `session.lifecycle.ts`
4. `session.handlers.ts`
5. `session.state.projector.ts`

Role:

1. all call session behavior and lifecycle transitions,
2. mapping JsSIP session events into state updates and app events.

Key responsibilities:

1. manage active session objects and RTC controllers,
2. enforce `maxSessionCount`,
3. attach/detach per-session handlers,
4. project session state,
5. expose command-level session actions with boolean success semantics.

### 3.6 `core/modules/ua`

Files:

1. `ua.module.ts`
2. `ua.handlers.ts`

Role:

1. UA registration/transport lifecycle,
2. mapping UA events into store and event emitter.

### 3.7 `core/modules/media`

Files:

1. `media.module.ts`
2. `mic-recovery.manager.ts`
3. `webrtc-session.controller.ts`
4. `types.ts`

Role:

1. media observation and session-bound media utilities,
2. optional microphone recovery strategy (no internal `getUserMedia` requests),
3. track/peer connection handling for `useSessionMedia`.

### 3.8 `core/modules/state`

Files:

1. `sip.state.ts`
2. `sip.state.store.ts`
3. `sip.selectors.ts`
4. `state.store.ts`

Role:

1. state initialization and in-memory storage,
2. internal/public state projection,
3. subscriptions and batched updates.

Current shape:

1. internal: normalized (`sessionsById`, `sessionIds`) + list (`sessions`),
2. public: `sipStatus`, `error`, `sessions`.

### 3.9 `core/modules/event`

Files:

1. `event-target.emitter.ts`
2. `event.bus.ts`
3. `sip-event-manager.adapter.ts`

Role:

1. internal event transport,
2. consumer-facing event subscription bridge.

Important behavior:

1. `onSession` is race-safe: it subscribes to `newRTCSession` first, then attaches to existing session if already present.

### 3.10 `core/modules/debug`

Files:

1. `sip-debug.runtime.ts`
2. `sip-debug.logger.ts`

Role:

1. runtime debug bridge and logging tools.

Current behavior:

1. no global side-effect import from package root,
2. debug hooks are activated through runtime path, not by implicit top-level side effect.

### 3.11 `core/modules/runtime`

File: `browser-unload.runtime.ts`

Role:

1. browser lifecycle glue (`beforeunload`) for safe cleanup.

## 4) React Bindings

### 4.1 Context and Provider

1. `src/context/index.tsx`: `SipContext`.
2. `src/provider/index.tsx`: injects ready kernel into tree.

### 4.2 Hooks

1. `useSip`: access kernel directly (`useSipKernel`).
2. `useSipState`: subscribe to public state.
3. `useSipSelector`: selector-based subscriptions.
4. `useSipActions`: command facade.
5. `useSipEvent` and `useSipSessionEvent`: event subscriptions.
6. `useSipSessions`, `useSipSession`, `useActiveSipSession`: session-level selectors.
7. `useSessionMedia`: derived media state for a session.

### 4.3 Component

1. `CallPlayer`: binds `remoteStream` from `useSessionMedia` into `<audio>`.

## 5) Runtime Lifecycle

### 5.1 Bootstrap Lifecycle

1. App calls `createSipKernel()`.
2. Kernel creates:
   `SipClient` -> `SipEventManager` -> `MediaModule`.
3. `SipProvider` injects kernel into React tree.
4. Hooks consume kernel via `useSipKernel()`.

### 5.2 UA Connect Lifecycle

1. `commands.connect(uri, password, config)` is called.
2. `SipClient.connect()` resets previous state via `disconnect()`.
3. UA starts through `UaModule.start(...)`.
4. UA handlers update store status:
   `disconnected` -> `connecting` -> `connected` -> `registered` (depending on flow).

### 5.3 Outgoing Call Lifecycle

1. `commands.call(target, options)` triggers `ua.call(...)`.
2. JsSIP emits `newRTCSession`.
3. `SessionLifecycle.handleNewRTCSession`:
   1. validates max sessions,
   2. creates/links RTC controller,
   3. attaches handlers,
   4. projects initial session state (`dialing` for local originator),
   5. emits `newRTCSession` for consumers.
4. Session events (`progress`, `accepted`, `confirmed`, `hold`, `unhold`, `muted`, `ended`, `failed`) update state and emit outward.

### 5.4 Incoming Call Lifecycle

1. JsSIP emits `newRTCSession` with remote originator.
2. Lifecycle projects session as `ringing`.
3. Consumer may call:
   `answer`, `hangup`, `toggleMute`, `toggleHold`, `sendDTMF`, `transfer`, `sendInfo`, `update`, `reinvite`.

### 5.5 Max Session Guard Lifecycle

1. On `newRTCSession`, if session count is at limit:
   1. incoming/new session gets `terminate(486 Busy Here)`,
   2. processing returns immediately,
   3. existing active session is not affected by continued projection flow.

### 5.6 Media Lifecycle

1. `useSessionMedia(sessionId?)` resolves target session.
2. `media.observePeerConnection(...)` subscribes to peer connection updates.
3. Hook rebuilds remote stream from receivers.
4. `CallPlayer` plays this remote stream.

### 5.7 Mic Recovery Lifecycle (Optional)

1. Enabled by connect config (`enableMicRecovery` and related timing options).
2. Recovery manager monitors sender/track health.
3. Attempts safe in-session repair when possible.
4. Does not request user media internally.

### 5.8 Event Subscription Lifecycle

1. `events.onUA(...)` subscribes directly to client emitter.
2. `events.onSession(sessionId, event, handler)`:
   1. subscribes to `newRTCSession`,
   2. tries immediate attach to existing session,
   3. reattaches when matching session appears,
   4. detaches on unsubscribe/disconnect.

### 5.9 Disconnect/Cleanup Lifecycle

1. `commands.disconnect()`:
   1. detaches unload runtime,
   2. stops UA,
   3. cleans all sessions and handlers,
   4. resets state,
   5. stops debug runtime observers.

## 6) State Model and Projection

Internal projection path:

1. session handlers call `upsertSessionState` and `removeSessionState`,
2. projector updates normalized maps and list incrementally,
3. store exposes:
   1. internal state for core modules,
   2. public state for consumers.

Public state contract:

1. `sipStatus`
2. `error`
3. `sessions`

Consumer guidance:

1. use hooks/selectors only,
2. do not depend on internal normalized fields.

## 7) Maintainer Change Checklist

When changing behavior:

1. update core logic in relevant `core/modules/*`,
2. verify `kernel/types.ts` and `createSipKernel.ts` are in sync,
3. verify `useSipActions` exposes new commands if public,
4. update `core/public-types.ts` and `src/index.ts` type exports,
5. update README + CHANGELOG for any public contract changes.
